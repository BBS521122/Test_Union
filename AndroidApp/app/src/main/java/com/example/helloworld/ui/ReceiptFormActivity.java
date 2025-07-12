package com.example.helloworld.ui;

import android.app.DatePickerDialog;
import android.app.TimePickerDialog;
import android.os.Bundle;
import android.text.TextUtils;
import android.util.Log;
import android.util.Patterns;
import android.widget.Button;
import android.widget.EditText;
import android.widget.RadioButton;
import android.widget.RadioGroup;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.example.helloworld.R;
import com.example.helloworld.api.ConferenceApi;
import com.example.helloworld.api.ReceiptApi;
import com.example.helloworld.model.HttpResponseEntity;
import com.example.helloworld.utils.ReceiptFormDTO;
import com.example.helloworld.utils.RetrofitInstance;
import com.google.android.material.button.MaterialButton;

import java.util.Calendar;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class ReceiptFormActivity extends AppCompatActivity {

    private EditText editUnit, editName, editPhone, editEmail;
    private EditText editArrivalTrain, editArrivalTime;
    private EditText editReturnTrain, editReturnTime;
    private EditText editRemarks;

    private RadioGroup radioGender, radioRoomType, radioArrival, radioReturn;
    private long conferenceId = -1;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_receipt_form);

        conferenceId = getIntent().getLongExtra("conferenceId", -1);
        // 获取 EditText
        editUnit = findViewById(R.id.editUnit);
        editName = findViewById(R.id.editName);
        editPhone = findViewById(R.id.editPhone);
        editEmail = findViewById(R.id.editEmail);
        editArrivalTrain = findViewById(R.id.editArrivalTrain);
        editArrivalTime = findViewById(R.id.editArrivalTime);
        editReturnTrain = findViewById(R.id.editReturnTrain);
        editReturnTime = findViewById(R.id.editReturnTime);
        editRemarks = findViewById(R.id.editRemarks);

        // 获取 RadioGroup
        radioGender = findViewById(R.id.radioGender);
        radioRoomType = findViewById(R.id.radioRoomType);
        radioArrival = findViewById(R.id.radioArrival);
        radioReturn = findViewById(R.id.radioReturn);

        // 时间选择器绑定
        editArrivalTime.setOnClickListener(v -> showDateTimePicker(editArrivalTime));
        editReturnTime.setOnClickListener(v -> showDateTimePicker(editReturnTime));

        // 返回按钮
        MaterialButton backButton = findViewById(R.id.btnBack);
        backButton.setOnClickListener(v -> finish());
        // 示例：点击提交按钮进行校验（假设你有 btnSubmit 按钮）
        findViewById(R.id.btnSubmit).setOnClickListener(v -> {
            if (validateForm()) {
                // TODO: 构建对象提交给后端
                submitForm();
                Toast.makeText(this, "验证通过，准备提交", Toast.LENGTH_SHORT).show();
            }
        });
    }
    private void submitForm() {
        if (!validateForm()) return;

        ReceiptFormDTO dto = new ReceiptFormDTO();
        dto.id = conferenceId;
        dto.unit = editUnit.getText().toString().trim();
        dto.name = editName.getText().toString().trim();
        dto.gender = getCheckedRadioText(radioGender);
        dto.phone = editPhone.getText().toString().trim();
        dto.email = editEmail.getText().toString().trim();
        dto.roomType = getCheckedRadioText(radioRoomType);
        dto.arrivalMethod = getCheckedRadioText(radioArrival);
        dto.arrivalTrain = editArrivalTrain.getText().toString().trim();
        dto.arrivalTime = editArrivalTime.getText().toString().trim();
        dto.returnMethod = getCheckedRadioText(radioReturn);
        dto.returnTrain = editReturnTrain.getText().toString().trim();
        dto.returnTime = editReturnTime.getText().toString().trim();
        dto.remarks = editRemarks.getText().toString().trim();

        Button btnSubmit = findViewById(R.id.btnSubmit);
        btnSubmit.setEnabled(false); // 禁用按钮，防止重复提交

        ReceiptApi api = RetrofitInstance.getReceiptApi(); // ✅ 使用正确的接口
        api.submitReceipt(dto).enqueue(new Callback<HttpResponseEntity<Integer>>() {
            @Override
            public void onResponse(Call<HttpResponseEntity<Integer>> call, Response<HttpResponseEntity<Integer>> response) {
                btnSubmit.setEnabled(true); // 恢复按钮
                Log.d("ReceiptApi", "onResponse: " + response.code());
                if (response.isSuccessful() && response.body() != null && response.body().code == 200) {
                    Toast.makeText(ReceiptFormActivity.this, "提交成功！", Toast.LENGTH_SHORT).show();
                    finish();
                } else {
                    String msg = response.body() != null ? response.body().message : "未知错误";
                    Toast.makeText(ReceiptFormActivity.this, "提交失败：" + msg, Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onFailure(Call<HttpResponseEntity<Integer>> call, Throwable t) {
                btnSubmit.setEnabled(true); // 恢复按钮
                Toast.makeText(ReceiptFormActivity.this, "网络错误：" + t.getMessage(), Toast.LENGTH_SHORT).show();
            }
        });
    }

    private String getCheckedRadioText(RadioGroup group) {
        int id = group.getCheckedRadioButtonId();
        if (id != -1) {
            RadioButton btn = findViewById(id);
            return btn.getText().toString();
        }
        return "";
    }

    private void showDateTimePicker(EditText targetEditText) {
        Calendar calendar = Calendar.getInstance();
        new DatePickerDialog(this, (view, year, month, day) -> {
            new TimePickerDialog(this, (timeView, hour, minute) -> {
                String datetime = String.format("%04d-%02d-%02d %02d:%02d",
                        year, month + 1, day, hour, minute);
                targetEditText.setText(datetime);
            }, calendar.get(Calendar.HOUR_OF_DAY), calendar.get(Calendar.MINUTE), true).show();
        }, calendar.get(Calendar.YEAR), calendar.get(Calendar.MONTH), calendar.get(Calendar.DAY_OF_MONTH)).show();
    }

    private boolean validateForm() {
        if (isEmpty(editUnit)) {
            editUnit.setError("请输入单位"); return false;
        }
        if (isEmpty(editName)) {
            editName.setError("请输入姓名"); return false;
        }
        if (radioGender.getCheckedRadioButtonId() == -1) {
            Toast.makeText(this, "请选择性别", Toast.LENGTH_SHORT).show(); return false;
        }
        if (isEmpty(editPhone)) {
            editPhone.setError("请输入手机号"); return false;
        }
        if (!Patterns.PHONE.matcher(editPhone.getText().toString()).matches()) {
            editPhone.setError("手机号格式错误"); return false;
        }
        if (isEmpty(editEmail)) {
            editEmail.setError("请输入邮箱"); return false;
        }
        if (!Patterns.EMAIL_ADDRESS.matcher(editEmail.getText().toString()).matches()) {
            editEmail.setError("邮箱格式错误"); return false;
        }
        if (radioRoomType.getCheckedRadioButtonId() == -1) {
            Toast.makeText(this, "请选择房型", Toast.LENGTH_SHORT).show(); return false;
        }
        if (radioArrival.getCheckedRadioButtonId() == -1) {
            Toast.makeText(this, "请选择到达方式", Toast.LENGTH_SHORT).show(); return false;
        }
        if (isEmpty(editArrivalTime)) {
            editArrivalTime.setError("请选择到达时间"); return false;
        }
        if (radioReturn.getCheckedRadioButtonId() == -1) {
            Toast.makeText(this, "请选择返程方式", Toast.LENGTH_SHORT).show(); return false;
        }
        if (isEmpty(editReturnTime)) {
            editReturnTime.setError("请选择返程时间"); return false;
        }
        return true;
    }

    private boolean isEmpty(EditText editText) {
        return TextUtils.isEmpty(editText.getText().toString().trim());
    }
}

