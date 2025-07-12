import 'element-plus/dist/index.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import axios from "axios";


// @ts-ignore
import App from './App.vue'
import router from './router'

const app = createApp(App)

app.config.globalProperties.$axios = axios;
axios.interceptors.request.use(
    config => {
        // 在发送请求之前做些什么
        config.headers.Authorization = localStorage.getItem("token")
        return config
    },
    error => {
        // 对请求错误做些什么
        return Promise.reject(error)
    }
)

axios.defaults.baseURL = 'http://localhost:8080';

app.use(createPinia())
app.use(router)
app.use(ElementPlus)

app.mount('#app')
