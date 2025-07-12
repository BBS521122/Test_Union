<template>
  <div class="register-container">
    <div class="register-box">
      <div class="logo-area">
        <img src="@/assets/logo.jpg" alt="测盟汇管理系统" class="logo">
        <h1 class="system-name">测盟汇管理系统</h1>
      </div>

      <el-form
          ref="registerFormRef"
          :model="registerForm"
          :rules="registerRules"
          class="register-form"
      >
        <el-form-item prop="contactPerson">
          <el-input
              v-model="registerForm.contactPerson"
              placeholder="请输入账号"
              prefix-icon="User"
              clearable
          />
        </el-form-item>

        <el-form-item prop="password">
          <el-input
              v-model="registerForm.password"
              placeholder="请输入密码"
              prefix-icon="Lock"
              show-password
              clearable
          />
        </el-form-item>

        <el-form-item prop="phone">
          <el-input
              v-model="registerForm.phone"
              placeholder="请输入手机号"
              prefix-icon="Phone"
              clearable
          />
        </el-form-item>

        <el-form-item prop="name">
          <el-input
              v-model="registerForm.name"
              placeholder="请输入企业名称"
              prefix-icon="User"
              clearable
          />
        </el-form-item>

        <el-form-item>
          <el-button
              type="primary"
              class="register-btn"
              :loading="loading"
              @click="handleRegister"
          >
            注 册
          </el-button>
        </el-form-item>

        <div class="login-link">
          已有账号？<el-link type="primary" @click="goToLogin">立即登录</el-link>
        </div>
      </el-form>
    </div>
  </div>
</template>

<script>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import axios from 'axios'

export default {
  setup() {
    const router = useRouter()
    const registerFormRef = ref(null)
    const registerForm = reactive({
      name: '',
      contactPerson: '',
      password: '',
      phone: ''
    })

    const registerRules = reactive({
      password: [
        {required: true, message: '请输入密码', trigger: 'blur'},
        {min: 6, max: 20, message: '长度在6到20个字符', trigger: 'blur'}
      ],
      name: [
        {required: true, message: '请输入企业名称', trigger: 'blur'}
      ]
    })

    const loading = ref(false)

    const handleRegister = async () => {
      try {
        loading.value = true
        // 先验证表单
        await registerFormRef.value.validate()
        // 发送请求
        const res = await axios.post('/tenant/register', registerForm)
        if (res.data.code === 200) {
          ElMessage.success('注册成功')
          router.push('/login')
        } else {
          ElMessage.error(res.data.message)
        }
      } catch (error) {
        if (error.response) {
          ElMessage.error(error.response.data.message || '注册失败')
        } else if (!error.message.includes('validate')) {
          ElMessage.error('请求失败，请检查网络')
        }
      } finally {
        loading.value = false
      }
    }

    const goToLogin = () => {
      router.push('/login')
    }

    return {
      registerFormRef,
      registerForm,
      registerRules,
      loading,
      handleRegister,
      goToLogin
    }
  }
}
</script>

<style scoped>
.register-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: url('@/assets/背景.jpg') no-repeat center center;
  background-size: cover;
  position: relative;
}

.register-box {
  width: 420px;
  padding: 40px;
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
  position: relative;
  z-index: 1;
}

.logo-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 20px;
}

.logo {
  width: 80px; /* 控制logo宽度 */
  height: 80px; /* 控制logo高度 */
  object-fit: contain; /* 保持图片比例 */
  margin-bottom: 10px;
}

.system-name {
  font-size: 18px;
  color: #333;
  margin: 0;
}

.register-btn {
  width: 100%;
  height: 45px;
  font-size: 16px;
  letter-spacing: 2px;
}

.login-link {
  text-align: center;
  margin-top: 20px;
  color: #606266;
  font-size: 14px;
}
</style>