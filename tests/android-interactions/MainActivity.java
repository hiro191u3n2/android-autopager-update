package jp.hiro.autopager.webviewtest;
import android.app.Activity;
import android.os.Bundle;
import android.webkit.*;
public class MainActivity extends Activity {
    public void onCreate(Bundle state) {
        super.onCreate(state);
        WebView.setWebContentsDebuggingEnabled(true);
        WebView view = new WebView(this);
        view.getSettings().setJavaScriptEnabled(true);
        view.getSettings().setDomStorageEnabled(true);
        view.getSettings().setUseWideViewPort(true);
        view.getSettings().setLoadWithOverviewMode(true);
        view.setWebViewClient(new WebViewClient(){
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request){return false;}
            @Override public boolean shouldOverrideUrlLoading(WebView view, String url){return false;}
            @Override public void onReceivedError(WebView view,WebResourceRequest req,WebResourceError err){if(req.isForMainFrame())android.util.Log.w("PagerTest","main "+err.getDescription());}
        });
        view.setWebChromeClient(new WebChromeClient());
        setContentView(view);
        view.loadData("<html><head><meta name='viewport' content='width=device-width'><title>Pager QA</title></head><body>Ready</body></html>", "text/html", "utf-8");
    }
}
