package jp.hiro.autopager.webviewtest;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.util.Log;
import android.view.WindowManager;
import android.webkit.ConsoleMessage;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import org.json.JSONArray;
import org.json.JSONObject;
import org.json.JSONTokener;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

/** Isolated test shell. Every HTTP(S) request is fulfilled locally or blocked. */
public final class MainActivity extends Activity {
    private static final String TAG = "AutoPagerTest";
    private final Handler handler = new Handler();
    private final List<String> javascriptErrors = new ArrayList<>();
    private WebView webView;
    private String variant;
    private String theme;
    private String shape;
    private boolean started;

    @Override public void onCreate(Bundle bundle) {
        super.onCreate(bundle);
        // Hide only the status bar. Keeping navigation visible avoids Android's
        // first-run immersive confirmation, which dims compositor screenshots.
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN,
                WindowManager.LayoutParams.FLAG_FULLSCREEN);
        variant = "control".equals(getIntent().getStringExtra("variant")) ? "control" : "current";
        theme = "dark".equals(getIntent().getStringExtra("theme")) ? "dark" : "light";
        shape = "plain".equals(getIntent().getStringExtra("shape")) ? "plain" : "mixed";
        webView = new WebView(this);
        webView.getSettings().setJavaScriptEnabled(true);
        webView.getSettings().setDomStorageEnabled(true);
        webView.getSettings().setUseWideViewPort(true);
        webView.getSettings().setLoadWithOverviewMode(true);
        webView.getSettings().setAllowFileAccess(false);
        webView.getSettings().setAllowContentAccess(false);
        webView.getSettings().setTextZoom(100);
        webView.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onConsoleMessage(ConsoleMessage message) {
                String text = message.messageLevel() + " " + message.message() + " @" + message.lineNumber();
                Log.i(TAG, text);
                if (message.messageLevel() == ConsoleMessage.MessageLevel.ERROR) {
                    synchronized (javascriptErrors) { javascriptErrors.add(text); }
                }
                return true;
            }
        });
        webView.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return response(request.getUrl());
            }
            @Override public void onPageFinished(WebView view, String url) {
                if (!started && url.startsWith("https://www.google.com/search")) {
                    started = true;
                    waitForPage(2, 0);
                }
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return !"www.google.com".equals(request.getUrl().getHost());
            }
        });
        setContentView(webView);
        webView.loadUrl("https://www.google.com/search?q=organic-fixture");
    }

    @Override public void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        String diagnosticAction = intent.getStringExtra("diagnostic_action");
        String diagnosticRequest = intent.getStringExtra("diagnostic_request");
        if (diagnosticAction != null && diagnosticRequest != null
                && diagnosticAction.matches("prepare|short-tap|resumed|opened|closed")
                && diagnosticRequest.matches("[0-9]{1,8}")) {
            recordDiagnostics(diagnosticAction, diagnosticRequest);
            return;
        }
        if (intent.getIntExtra("next_page", 0) == 3) {
            webView.evaluateJavascript("scrollTo(0,document.documentElement.scrollHeight)", null);
            waitForPage(3, 0);
        }
    }

    private WebResourceResponse response(Uri url) {
        String asset = null;
        String mime = "text/html";
        if ("https".equals(url.getScheme()) && "www.google.com".equals(url.getHost())) {
            if ("/search".equals(url.getPath())) {
                String start = url.getQueryParameter("start");
                if (start == null || "0".equals(start)) start = "0";
                if ("0".equals(start) || "10".equals(start) || "20".equals(start)) {
                    asset = "fixture-" + shape + "-" + theme + "-" + start + ".html";
                }
            } else if ("/fixture-userscript.js".equals(url.getPath())) {
                asset = "script-" + variant + ".js";
                mime = "application/javascript";
            } else if ("/fixture-probe.js".equals(url.getPath())) {
                asset = "probe.js";
                mime = "application/javascript";
            }
        }
        try {
            InputStream stream = asset == null
                    ? new ByteArrayInputStream(new byte[0]) : getAssets().open(asset);
            HashMap<String, String> headers = new HashMap<>();
            headers.put("Cache-Control", "no-store");
            return new WebResourceResponse(mime, "UTF-8", asset == null ? 404 : 200,
                    asset == null ? "Blocked by fixture test" : "OK", headers, stream);
        } catch (Exception error) {
            Log.e(TAG, "Asset response failed", error);
            return new WebResourceResponse("text/plain", "UTF-8",
                    new ByteArrayInputStream(error.toString().getBytes(StandardCharsets.UTF_8)));
        }
    }

    private void waitForPage(final int number, final int attempt) {
        if (attempt > 180) { fail("Timed out waiting for appended page " + number); return; }
        String exists = "!!document.querySelector('.generic-autopager-page[data-page=\"" + number + "\"]')";
        // The standalone android.jar bootclasspath has no LambdaMetafactory.
        webView.evaluateJavascript(exists, new ValueCallback<String>() {
            @Override public void onReceiveValue(String value) {
                if (!"true".equals(value)) {
                    handler.postDelayed(new Runnable() {
                        @Override public void run() { waitForPage(number, attempt + 1); }
                    }, 250);
                    return;
                }
                handler.postDelayed(new Runnable() {
                    @Override public void run() {
                        webView.evaluateJavascript("window.__autoPagerFixture.scroll(" + number + ")",
                                new ValueCallback<String>() {
                            @Override public void onReceiveValue(String ignored) {
                                handler.postDelayed(new Runnable() {
                                    @Override public void run() { record(number); }
                                }, 500);
                            }
                        });
                    }
                }, 700);
            }
        });
    }

    private void record(final int number) {
        webView.evaluateJavascript("JSON.stringify(window.__autoPagerFixture.snapshot(" + number + "))",
                new ValueCallback<String>() {
            @Override public void onReceiveValue(String value) {
                recordSnapshot(number, value);
            }
        });
    }

    private void recordDiagnostics(final String action, final String request) {
        String script = "JSON.stringify(window.__autoPagerFixture.diagnostics("
                + JSONObject.quote(action) + "))";
        webView.evaluateJavascript(script, new ValueCallback<String>() {
            @Override public void onReceiveValue(String value) {
                try {
                    Object decoded = new JSONTokener(value).nextValue();
                    if (!(decoded instanceof String)) throw new IllegalStateException("No diagnostic probe: " + value);
                    JSONObject report = new JSONObject((String) decoded);
                    int[] location = new int[2];
                    webView.getLocationOnScreen(location);
                    report.put("request", request);
                    report.put("action", action);
                    report.put("variant", variant);
                    report.put("theme", theme);
                    report.put("shape", shape);
                    report.put("androidApi", Build.VERSION.SDK_INT);
                    report.put("viewX", location[0]); report.put("viewY", location[1]);
                    report.put("viewWidth", webView.getWidth()); report.put("viewHeight", webView.getHeight());
                    synchronized (javascriptErrors) { report.put("consoleErrors", new JSONArray(javascriptErrors)); }
                    writeDiagnosticsAfterFrame(report, request);
                } catch (Exception error) { fail(error.toString()); }
            }
        });
    }

    private void writeDiagnosticsAfterFrame(final JSONObject report, final String request) {
        if (Build.VERSION.SDK_INT < 29 || !webView.isHardwareAccelerated()) {
            fail("Diagnostic compositor synchronization requires API 29+ hardware rendering");
            return;
        }
        // evaluateJavascript confirms DOM state, not the pixels drawn by the
        // WebView. Wait for that state and its next submitted Android frame.
        webView.postVisualStateCallback(Long.parseLong(request), new WebView.VisualStateCallback() {
            @Override public void onComplete(final long requestId) {
                if (!webView.isAttachedToWindow()) { fail("WebView detached before diagnostic frame"); return; }
                webView.getViewTreeObserver().registerFrameCommitCallback(new Runnable() {
                    @Override public void run() {
                        handler.post(new Runnable() {
                            @Override public void run() {
                                try {
                                    report.put("visualStateRequest", requestId);
                                    report.put("frameCommitted", true);
                                    report.put("frameCommittedAtMs", android.os.SystemClock.uptimeMillis());
                                    write("diagnostics-" + request + ".json", report.toString(2));
                                } catch (Exception error) { fail(error.toString()); }
                            }
                        });
                    }
                });
                webView.invalidate();
            }
        });
    }

    private void recordSnapshot(int number, String value) {
            try {
                Object decoded = new JSONTokener(value).nextValue();
                if (!(decoded instanceof String)) throw new IllegalStateException("No geometry: " + value);
                JSONObject report = new JSONObject((String) decoded);
                int[] location = new int[2];
                webView.getLocationOnScreen(location);
                report.put("variant", variant);
                report.put("theme", theme);
                report.put("shape", shape);
                report.put("androidApi", Build.VERSION.SDK_INT);
                report.put("androidRelease", Build.VERSION.RELEASE);
                report.put("viewX", location[0]); report.put("viewY", location[1]);
                report.put("viewWidth", webView.getWidth()); report.put("viewHeight", webView.getHeight());
                PackageInfo provider = WebView.getCurrentWebViewPackage();
                report.put("webviewPackage", provider == null ? JSONObject.NULL : provider.packageName);
                report.put("webviewVersion", provider == null ? JSONObject.NULL : provider.versionName);
                synchronized (javascriptErrors) { report.put("consoleErrors", new JSONArray(javascriptErrors)); }
                write("ready-" + number + ".json", report.toString(2));
                Log.i(TAG, "READY page=" + number + " variant=" + variant + " theme=" + theme);
            } catch (Exception error) { fail(error.toString()); }
    }

    private void write(String filename, String text) throws Exception {
        File temporary = new File(getFilesDir(), filename + ".tmp");
        try (FileOutputStream stream = new FileOutputStream(temporary)) {
            stream.write(text.getBytes(StandardCharsets.UTF_8));
        }
        if (!temporary.renameTo(new File(getFilesDir(), filename))) throw new IllegalStateException("Atomic report write failed");
    }

    private void fail(String message) {
        Log.e(TAG, message);
        try { write("error.txt", message); } catch (Exception ignored) { }
    }
}
