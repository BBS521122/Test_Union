package com.example.helloworld.ui;

import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.ViewGroup;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.example.helloworld.R;
import com.example.helloworld.api.ConferenceApi;
import com.example.helloworld.model.ConferenceGetDTO;
import com.example.helloworld.model.HttpResponseEntity;
import com.example.helloworld.utils.RetrofitInstance;
import com.google.android.material.button.MaterialButton;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class ConferenceDetailActivity extends AppCompatActivity {

    private ConferenceApi api;
    private TextView tvTitle;
    private TextView tvUserName;
    private TextView tvTime;
    private WebView webViewContent;
    private long conferenceId = -1;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_conference_detail);

        // 初始化控件
        tvTitle = findViewById(R.id.tvTitle);
        tvUserName = findViewById(R.id.tvUserName);
        tvTime = findViewById(R.id.tvTime);
        webViewContent = findViewById(R.id.webViewContent);

        // 返回按钮
        MaterialButton backButton = findViewById(R.id.btnBack);
        backButton.setOnClickListener(v -> finish());

        // WebView 设置
        WebSettings settings = webViewContent.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false); // 允许自动播放
        settings.setDomStorageEnabled(true); // 启用DOM存储
        settings.setAllowFileAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setTextZoom(110); // 放大整体文字显示
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        }

        // 让页面加载完成后自动调整高度
        webViewContent.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                webViewContent.evaluateJavascript(
                        "(function() { return document.body.scrollHeight; })();",
                        value -> {
                            try {
                                int height = (int) (Float.parseFloat(value) * getResources().getDisplayMetrics().density);
                                webViewContent.setLayoutParams(new LinearLayout.LayoutParams(
                                        ViewGroup.LayoutParams.MATCH_PARENT, height));
                            } catch (Exception e) {
                                e.printStackTrace();
                            }
                        }
                );
            }
        });

        Button fillButton = findViewById(R.id.btnFillReceipt);
        fillButton.setOnClickListener(v -> {
            if (conferenceId != -1) {
                Intent intent = new Intent(ConferenceDetailActivity.this, ReceiptFormActivity.class);
                intent.putExtra("conferenceId", conferenceId);
                startActivity(intent);
            } else {
                Toast.makeText(this, "会议 ID 无效，无法填写回执", Toast.LENGTH_SHORT).show();
            }
        });

        api = RetrofitInstance.getConferenceApi();

        conferenceId = getIntent().getLongExtra("conferenceId", -1);
        if (conferenceId != -1) {
            loadConferenceDetail(conferenceId);
        } else {
            Toast.makeText(this, "未传入会议 ID", Toast.LENGTH_SHORT).show();
        }
    }

    private void loadConferenceDetail(long id) {
        api.getConferenceById(id).enqueue(new Callback<HttpResponseEntity<ConferenceGetDTO>>() {
            @Override
            public void onResponse(Call<HttpResponseEntity<ConferenceGetDTO>> call,
                                   Response<HttpResponseEntity<ConferenceGetDTO>> response) {
                if (response.isSuccessful() && response.body() != null && response.body().code == 200) {
                    ConferenceGetDTO data = response.body().data;

                    tvTitle.setText(data.getName());
                    tvUserName.setText("发布者：" + data.getUserName());
                    tvTime.setText("时间：" + data.getStartTime() + " 至 " + data.getEndTime());

                    String htmlContent = data.getContent();


                    // 包裹完整 HTML 页面，并设置样式
                    String html = "<html><head>" +
                            "<meta charset=\"UTF-8\">" +
                            "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">" +
                            "<style>" +
                            "body { font-size:18px; color:#333; line-height:1.8; padding: 0 10px; }" +
                            "video { max-width:100%; min-height:200px; background:#000; margin:12px 0; }" +
                            "img { max-width:100%; height:auto; margin:12px 0; }" +
                            "p { margin:10px 0; }" +
                            "</style></head><body>" +
                            htmlContent +
                            "</body></html>";

                    Log.d("ReceiptFormActivity", "loadConferenceDetail: " + html);

                    webViewContent.loadDataWithBaseURL(null, html, "text/html", "utf-8", null);

                } else {
                    Toast.makeText(ConferenceDetailActivity.this, "获取失败：" + response.code(), Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onFailure(Call<HttpResponseEntity<ConferenceGetDTO>> call, Throwable t) {
                Toast.makeText(ConferenceDetailActivity.this, "网络错误：" + t.getMessage(), Toast.LENGTH_SHORT).show();
            }
        });
    }
}
