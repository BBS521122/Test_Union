package com.example.helloworld.api;

import com.example.helloworld.model.HttpResponseEntity;
import com.example.helloworld.utils.ReceiptFormDTO;

import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.POST;

public interface ReceiptApi {
    @POST("receipt/submit")
    Call<HttpResponseEntity<Integer>> submitReceipt(@Body ReceiptFormDTO dto);
}

