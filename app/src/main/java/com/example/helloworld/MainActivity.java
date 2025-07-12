package com.example.helloworld;

import android.app.AlertDialog;
import android.content.DialogInterface;
import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.widget.AdapterView;
import android.widget.Button;
import android.widget.GridView;
import androidx.appcompat.app.AppCompatActivity;

import com.example.helloworld.ui.DetailActivity;
import com.example.helloworld.ui.GridAdapter;

import java.util.ArrayList;
import java.util.List;

public class MainActivity extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        // 创建数据列表
        List<GridItem> gridItems = new ArrayList<>();
        gridItems.add(new GridItem("会议研讨", "协会组织会员单位召开行业会议，研讨相关技术与行。"));
        gridItems.add(new GridItem("标准制定", "协会组织成员单位联合制定软件测试行业标准。"));
        gridItems.add(new GridItem("技术培训", "协会组织会员单位开展软件测试技术、软件进行作业。"));
        gridItems.add(new GridItem("工具研发", "协会组织会员单位共同开发软件测试相关工具。"));
        gridItems.add(new GridItem("公益行动", "协会组织会员单位参与公益活动。"));

        // 设置适配器
        GridAdapter adapter = new GridAdapter(this, gridItems);
        GridView gridView = findViewById(R.id.gridView);
        gridView.setAdapter(adapter);

        // 设置点击事件
        gridView.setOnItemClickListener(new AdapterView.OnItemClickListener() {
            @Override
            public void onItemClick(AdapterView<?> parent, View view, int position, long id) {
                GridItem item = gridItems.get(position);

                if ("公益行动".equals(item.getTitle())) {
                    // 显示小程序弹窗
                    showMiniProgramDialog(item.getTitle());
                } else {
                    // 其他项直接打开详情
                    openDetailActivity(item.getTitle());
                }
            }
        });
    }
    // 显示小程序弹窗
    private void showMiniProgramDialog(final String title) {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle("即将打开\"云南故事农业科技有限公司\"小程序");
        builder.setMessage("公益行动\n会员单位积极参与火灾活动，\n区留守儿童公益活动。");

        builder.setNegativeButton("取消", new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) {
                dialog.dismiss(); // 关闭弹窗，留在当前页面
            }
        });

        builder.setPositiveButton("允许", new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) {
                openDetailActivity(title); // 打开详情页面
            }
        });

        AlertDialog dialog = builder.create();
        dialog.show();

        // 可选：自定义按钮样式
        dialog.setOnShowListener(new DialogInterface.OnShowListener() {
            @Override
            public void onShow(DialogInterface d) {
                Button negativeButton = dialog.getButton(AlertDialog.BUTTON_NEGATIVE);
                negativeButton.setTextColor(Color.GRAY);

                Button positiveButton = dialog.getButton(AlertDialog.BUTTON_POSITIVE);
                positiveButton.setTextColor(Color.BLUE);
            }
        });
    }

    private void openDetailActivity(String title) {
        Intent intent = new Intent(this, DetailActivity.class);
        intent.putExtra("TITLE", title);
        startActivity(intent);
    }

    // 网格项数据类
    public static class GridItem {
        private final String title;
        private final String content;

        public GridItem(String title, String content) {
            this.title = title;
            this.content = content;
        }

        public String getTitle() { return title; }
        public String getContent() { return content; }
    }
}

//    private void loadConferences() {
//        Object emptyRequest = new Object(); // 你也可以用自定义 RequestDTO
//
//        api.getAllConferences(emptyRequest, 1, 10)
//                .enqueue(new Callback<HttpResponseEntity<List<ConferenceDTO>>>() {
//                    @Override
//                    public void onResponse(Call<HttpResponseEntity<List<ConferenceDTO>>> call,
//                                           Response<HttpResponseEntity<List<ConferenceDTO>>> response) {
//                        if (response.isSuccessful() && response.body() != null) {
//                            HttpResponseEntity<List<ConferenceDTO>> entity = response.body();
//                            if (entity.code == 200 && entity.data != null) {
//                                StringBuilder builder = new StringBuilder();
//                                builder.append("会议列表：\n\n");
//                                for (ConferenceDTO dto : entity.data) {
//                                    builder.append("名称: ").append(dto.name).append("\n");
//                                    builder.append("时间: ").append(dto.startTime).append(" - ").append(dto.endTime).append("\n");
//                                    builder.append("状态: ").append(dto.state).append("\n");
//                                    builder.append("发布者: ").append(dto.userName).append("\n\n");
//                                }
//                                resultText.setText(builder.toString());
//                            } else {
//                                resultText.setText("接口响应异常：" + entity.message);
//                            }
//                        } else {
//                            resultText.setText(response.code()+"响应失败，请检查服务端接口");
//                        }
//                    }
//
//                    @Override
//                    public void onFailure(Call<HttpResponseEntity<List<ConferenceDTO>>> call, Throwable t) {
//                        resultText.setText("网络错误：" + t.getMessage());
//                    }
//                });
//    }