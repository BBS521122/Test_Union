package com.example.helloworld.api;

import com.example.helloworld.model.ConferenceDTO;
import com.example.helloworld.model.ConferenceGetDTO;
import com.example.helloworld.model.HttpResponseEntity;
import com.example.helloworld.utils.ReceiptFormDTO;
import com.example.helloworld.utils.RequestDTO;

import java.util.List;

import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.GET;
import retrofit2.http.POST;
import retrofit2.http.Query;

public interface ConferenceApi {
    @POST("conference/get")
    Call<HttpResponseEntity<List<ConferenceDTO>>> getAllConferences(
            @Body RequestDTO requestDTO, // 你也可以定义成实际的 RequestDTO 类
            @Query("page") int page,
            @Query("pageSize") int pageSize
    );
    @GET("conference/get-info")
    Call<HttpResponseEntity<ConferenceGetDTO>> getConferenceById(@Query("id") Long id);

}