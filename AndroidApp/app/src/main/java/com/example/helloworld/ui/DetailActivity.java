package com.example.helloworld.ui;
import android.os.Bundle;
import android.view.View;
import android.widget.Toast;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;

import com.example.helloworld.R;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.example.helloworld.api.ConferenceApi;
import com.example.helloworld.model.ConferenceDTO;
import com.example.helloworld.model.HttpResponseEntity;
import com.example.helloworld.utils.RequestDTO;
import com.example.helloworld.utils.RetrofitInstance;
import com.google.android.material.button.MaterialButton;

import java.util.Arrays;
import java.util.List;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class DetailActivity extends AppCompatActivity {

    private TextView titleView;
    private RecyclerView recyclerView;
    private ConferenceAdapter conferenceAdapter;
    private SimpleTextAdapter simpleTextAdapter;
    private ConferenceApi api;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_detail);

        titleView = findViewById(R.id.detailTitle);
        recyclerView = findViewById(R.id.recyclerView);
        recyclerView.setLayoutManager(new LinearLayoutManager(this));

        MaterialButton backButton = findViewById(R.id.btnBack);
        backButton.setOnClickListener(v -> finish());

        String title = getIntent().getStringExtra("TITLE");
        titleView.setText(title + " 详情");

        switch (title) {
            case "会议研讨":
                api = RetrofitInstance.getConferenceApi();
                loadConferences();
                break;
            case "标准制定":
                showLocalList(Arrays.asList(
                        "《软件测试通用规范（征求意见稿）》已发布。",
                        "参与全国信息技术标准化技术委员会会议。",
                        "推动建立行业安全测试标准与流程指南。"
                ));
                break;
            case "技术培训":
                showLocalList(Arrays.asList(
                        "开展自动化测试实战培训课程。",
                        "组织高校与企业联合讲座活动。",
                        "发布在线学习平台《测试实训营》。"
                ));
                break;
            case "工具研发":
                showLocalList(Arrays.asList(
                        "联合开发自动化测试平台 TestFlow。",
                        "推出接口测试工具 EasyMock。",
                        "开源静态代码检查工具 SafeScan。"
                ));
                break;
            case "公益行动":
                showLocalList(Arrays.asList(
                        "开展“数字公益”测试义诊活动。",
                        "捐赠旧电子设备支持远程教育。",
                        "参与国家应急响应志愿者团队。"
                ));
                break;
            default:
                recyclerView.setVisibility(View.GONE);
                break;
        }
    }

    private void showLocalList(List<String> items) {
        simpleTextAdapter = new SimpleTextAdapter(this, items);
        recyclerView.setAdapter(simpleTextAdapter);
    }

    private void loadConferences() {
        RequestDTO request = new RequestDTO();
        api.getAllConferences(request, 1, 10)
                .enqueue(new Callback<HttpResponseEntity<List<ConferenceDTO>>>() {
                    @Override
                    public void onResponse(Call<HttpResponseEntity<List<ConferenceDTO>>> call,
                                           Response<HttpResponseEntity<List<ConferenceDTO>>> response) {
                        if (response.isSuccessful() && response.body() != null && response.body().code == 200) {
                            List<ConferenceDTO> list = response.body().data;
                            conferenceAdapter = new ConferenceAdapter(DetailActivity.this, list);
                            recyclerView.setAdapter(conferenceAdapter);
                        } else {
                            Toast.makeText(DetailActivity.this, "加载失败：" + response.code(), Toast.LENGTH_SHORT).show();
                        }
                    }

                    @Override
                    public void onFailure(Call<HttpResponseEntity<List<ConferenceDTO>>> call, Throwable t) {
                        Toast.makeText(DetailActivity.this, "网络错误：" + t.getMessage(), Toast.LENGTH_SHORT).show();
                    }
                });
    }
}

