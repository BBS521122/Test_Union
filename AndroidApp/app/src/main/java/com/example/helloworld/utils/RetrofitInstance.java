package com.example.helloworld.utils;

import com.example.helloworld.api.ConferenceApi;
import com.example.helloworld.api.ReceiptApi;

import retrofit2.Retrofit;
import retrofit2.converter.gson.GsonConverterFactory;

public class RetrofitInstance {
    private static Retrofit retrofit;
    private static final String BASE_URL = "http://10.0.2.2:8080/";

    private static void init() {
        if (retrofit == null) {
            retrofit = new Retrofit.Builder()
                    .baseUrl(BASE_URL)
                    .addConverterFactory(GsonConverterFactory.create())
                    .build();
        }
    }

    public static ConferenceApi getConferenceApi() {
        init();
        return retrofit.create(ConferenceApi.class);
    }

    public static ReceiptApi getReceiptApi() {
        init();
        return retrofit.create(ReceiptApi.class);
    }
}


