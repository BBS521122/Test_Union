<template>
  <div class="profile-container">
    <div class="profile-header">
      <div class="header-content">
        <el-button
            type="text"
            @click="handleGoBack"
            class="back-button"
        >
          <el-icon class="back-icon">
            <ArrowLeft/>
          </el-icon>
          <span>返回</span>
        </el-button>
        <h2>基本资料</h2>
      </div>
    </div>

    <div class="profile-content">
      <div class="profile-section">
        <div class="section-title">
          基本资料
          <el-button
              type="primary"
              size="small"
              @click="toggleEditMode"
              :loading="infoLoading"
              style="float: right;"
          >
            {{ isEditing ? '取消' : '编辑' }}
          </el-button>
          <el-button
              v-if="isEditing"
              type="success"
              size="small"
              @click="handleSaveInfo"
              :loading="infoLoading"
              style="float: right; margin-right: 10px;"
          >
            保存
          </el-button>
        </div>
        <div class="section-content">
          <el-form
              :model="userInfo"
              label-width="120px"
              style="max-width: 500px"
              :rules="userInfoRules"
              ref="userInfoFormRef"
          >
            <el-form-item label="用户昵称" prop="nickname">
              <el-input
                  v-if="isEditing"
                  v-model="userInfo.nickname"
                  placeholder="请输入用户昵称"
              />
              <span v-else class="info-display">{{ userInfo.nickname || '--' }}</span>
            </el-form-item>
            <el-form-item label="手机号码" prop="phone">
              <el-input
                  v-if="isEditing"
                  v-model="userInfo.phone"
                  placeholder="请输入手机号码"
              />
              <span v-else class="info-display">{{ userInfo.phone || '--' }}</span>
            </el-form-item>
            <el-form-item label="邮箱" prop="email">
              <el-input
                  v-if="isEditing"
                  v-model="userInfo.email"
                  placeholder="请输入邮箱地址"
              />
              <span v-else class="info-display">{{ userInfo.email || '--' }}</span>
            </el-form-item>
            <el-form-item label="性别" prop="gender">
              <el-radio-group
                  v-model="userInfo.gender"
                  :disabled="!isEditing"
                  @change="isEditing && handleGenderChange"
              >
                <el-radio label="男" size="large">男</el-radio>
                <el-radio label="女" size="large">女</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-form>
        </div>
      </div>

      <div class="profile-section">
        <div class="section-title">修改密码</div>
        <div class="section-content">
          <el-form
              :model="passwordForm"
              label-width="120px"
              style="max-width: 500px"
              :rules="passwordRules"
              ref="passwordFormRef"
          >
            <el-form-item label="当前密码" prop="currentPassword">
              <el-input
                  v-model="passwordForm.currentPassword"
                  type="password"
                  show-password
                  placeholder="请输入当前密码"
              />
            </el-form-item>
            <el-form-item label="新密码" prop="newPassword">
              <el-input
                  v-model="passwordForm.newPassword"
                  type="password"
                  show-password
                  placeholder="请输入新密码"
              />
            </el-form-item>
            <el-form-item label="确认新密码" prop="confirmPassword">
              <el-input
                  v-model="passwordForm.confirmPassword"
                  type="password"
                  show-password
                  placeholder="请再次输入新密码"
              />
            </el-form-item>
            <el-form-item>
              <el-button
                  type="primary"
                  @click="handleChangePassword"
                  :loading="passwordLoading"
              >
                保存修改
              </el-button>
            </el-form-item>
          </el-form>
        </div>
      </div>

      <div class="profile-section">
        <div class="section-title">头像设置</div>
        <div class="section-content">
          <div class="avatar-uploader">
            <el-upload
                class="avatar-upload"
                action="#"
                :show-file-list="false"
                :http-request="handleAvatarUpload"
                :before-upload="beforeAvatarUpload"
                :disabled="avatarLoading"
            >
              <template v-if="avatarLoading">
                <el-icon class="is-loading" style="font-size: 28px">
                  <Loading/>
                </el-icon>
              </template>
              <template v-else>
                <img v-if="userInfo.avatar" :src="userInfo.avatar" class="avatar"/>
                <el-icon v-else class="avatar-uploader-icon">
                  <Plus/>
                </el-icon>
              </template>
              <div class="upload-tips">点击上传头像</div>
            </el-upload>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {ref, onMounted, reactive} from 'vue'
import {
  ElMessage,
  ElRadioGroup,
  ElRadio,
  ElForm,
  ElFormItem,
  ElInput,
  ElButton,
  ElUpload,
  ElMessageBox
} from 'element-plus'
import {Plus, Loading} from '@element-plus/icons-vue'
import type {FormInstance, FormRules} from 'element-plus'

// 编辑状态
const isEditing = ref(false)
const infoLoading = ref(false)

// 用户信息
const userInfo = reactive<UserInfo & { avatar: string }>({
  nickname: '',
  phone: '',
  email: '',
  gender: '男',
  avatar: ''
});

// 保存原始用户信息，用于取消编辑时恢复
const originalUserInfo = reactive<UserInfo & { avatar: string }>({
  nickname: '',
  phone: '',
  email: '',
  gender: '男',
  avatar: ''
});

// 用户信息表单验证规则
const userInfoRules: FormRules = {
  nickname: [
    {required: true, message: '请输入用户昵称', trigger: 'blur'},
    {min: 2, max: 20, message: '昵称长度在2到20个字符', trigger: 'blur'}
  ],
  phone: [
    {required: true, message: '请输入手机号码', trigger: 'blur'},
    {pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码', trigger: 'blur'}
  ],
  email: [
    {required: true, message: '请输入邮箱地址', trigger: 'blur'},
    {type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur'}
  ],
  gender: [
    {required: true, message: '请选择性别', trigger: 'change'}
  ]
}

// 密码表单
const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// 表单验证规则
const passwordRules: FormRules = {
  currentPassword: [
    {required: true, message: '请输入当前密码', trigger: 'blur'},
    {min: 6, max: 20, message: '密码长度在6到20个字符', trigger: 'blur'}
  ],
  newPassword: [
    {required: true, message: '请输入新密码', trigger: 'blur'},
    {min: 6, max: 20, message: '密码长度在6到20个字符', trigger: 'blur'}
  ],
  confirmPassword: [
    {required: true, message: '请确认新密码', trigger: 'blur'},
    {
      validator: (rule, value, callback) => {
        if (value !== passwordForm.value.newPassword) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

// 表单引用
const userInfoFormRef = ref<FormInstance>()
const passwordFormRef = ref<FormInstance>()

// 加载状态
const passwordLoading = ref(false)
const avatarLoading = ref(false)

// 返回功能
const handleGoBack = () => {
  // 如果正在编辑，提示用户是否保存
  if (isEditing.value) {
    ElMessageBox.confirm(
        '您有未保存的修改，是否确认离开？',
        '提示',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        }
    ).then(() => {
      // 用户确认离开，恢复原始数据并退出编辑模式
      Object.assign(userInfo, originalUserInfo)
      isEditing.value = false
      // 执行返回操作
      goBack()
    }).catch(() => {
      // 用户取消，不执行任何操作
    })
  } else {
    // 没有在编辑，直接返回
    goBack()
  }
}

import {useRouter} from 'vue-router'
const router = useRouter()

// 实际的返回逻辑
const goBack = () => {
  if (localStorage.getItem('role') === 'ADMIN') {
    router.push('/admin')
  } else {
    router.push('/user')
  }
}

// 切换编辑模式
const toggleEditMode = () => {
  if (isEditing.value) {
    // 取消编辑，恢复原始数据
    Object.assign(userInfo, originalUserInfo)
    isEditing.value = false
  } else {
    // 进入编辑模式，保存当前数据
    Object.assign(originalUserInfo, userInfo)
    isEditing.value = true
  }
}

// 保存用户信息
const handleSaveInfo = async () => {
  try {
    await userInfoFormRef.value?.validate()
    infoLoading.value = true

    // 创建用户信息对象
    const userInfoData: UserInfo = {
      nickname: userInfo.nickname,
      phone: userInfo.phone,
      email: userInfo.email,
      gender: userInfo.gender
    }

    // 调用更新用户信息的API，传送用户信息类对象
    const response = await axios.post('/user/update', userInfoData)

    if (response.data.code == 200) {
      ElMessage.success('用户信息更新成功')
      // 更新原始数据
      Object.assign(originalUserInfo, userInfo)
      isEditing.value = false
    } else {
      ElMessage.error(response.data.message || '用户信息更新失败')
    }
  } catch (error) {
    console.error('用户信息更新失败:', error)
    ElMessage.error('用户信息更新失败')
  } finally {
    infoLoading.value = false
  }
}

// 处理性别变化（在编辑模式下立即保存）
const handleGenderChange = () => {
  // 如果需要性别变化立即生效，可以在这里调用API
  // 当前实现是等待用户点击保存按钮
}

// 加载用户信息
const loadUserInfo = async () => {
  try {
    axios.get('/user/get')
        .then(response => {
          if (response.data.code == 200 && response.data.data) {
            console.log(response.data)
            Object.assign(userInfo, response.data.data)
            Object.assign(originalUserInfo, response.data.data)
          } else {
            ElMessage.error('获取用户信息失败')
          }
        }).catch(error => {
      console.error('获取用户信息失败:', error)
      ElMessage.error('获取用户信息失败')
    })

    axios.get('/user/get-avatar')
        .then(response => {
          if (response.data.code == 200 && response.data.data) {
            console.log(response.data)
            userInfo.avatar = response.data.data
            originalUserInfo.avatar = response.data.data
          } else {
            ElMessage.error('暂无头像，以默认头像代替')
            userInfo.avatar = "https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png"
            originalUserInfo.avatar = "https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png"
          }
        }).catch(error => {
      console.error('暂无头像:', error)
      ElMessage.error('暂无头像，以默认头像代替')
      userInfo.avatar = "https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png"
      originalUserInfo.avatar = "https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png"
    })
  } catch (error) {
    ElMessage.error('获取用户信息失败')
  }
}

// 修改密码
const handleChangePassword = async () => {
  try {
    await passwordFormRef.value?.validate()

    passwordLoading.value = true

    await axios.post(`/user/update-password`, {
      oldPassword: passwordForm.value.currentPassword,
      newPassword: passwordForm.value.newPassword,
    })
        .then(response => {
          if (response.data.code == 200) {
            console.log(response.data)
            ElMessage.success('密码修改成功')
          } else if (response.data.code == 400) {
            console.log(response.data)
            ElMessage.error('旧密码错误')
          } else {
            ElMessage.error('密码修改失败')
          }
        }).catch(error => {
          console.error('密码修改失败:', error)
          ElMessage.error('密码修改失败')
        })
    passwordForm.value = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
  } catch (error) {
    if (error instanceof Error) {
      ElMessage.error(error.message || '密码修改失败')
    }
  } finally {
    passwordLoading.value = false
  }
}

// 头像上传
const handleAvatarUpload = async (options: any) => {
  try {
    avatarLoading.value = true
    const formData = new FormData();
    formData.append('file', options.file);
    const response = await axios.post('/user/update_avatar', formData);
    if (response.data.code == 200) {
      userInfo.avatar = response.data.url + '?t=' + Date.now();
      originalUserInfo.avatar = response.data.url + '?t=' + Date.now();
      console.log(response.data)
      ElMessage.success('头像上传成功！');
    } else {
      ElMessage.error('头像上传失败！');
    }
  } catch (error) {
    ElMessage.error('头像上传失败')
  } finally {
    avatarLoading.value = false
  }
}

const beforeAvatarUpload = (file: any) => {
  const isJPG = file.type === 'image/jpeg' || file.type === 'image/png'
  const isLt2M = file.size / 1024 / 1024 < 2

  if (!isJPG) {
    ElMessage.error('上传头像图片只能是 JPG/PNG 格式!')
    return false
  }
  if (!isLt2M) {
    ElMessage.error('上传头像图片大小不能超过 2MB!')
    return false
  }
  return true
}

// 组件挂载时加载用户信息
onMounted(() => {
  loadUserInfo()
})

import axios from 'axios';
import type {AxiosResponse} from 'axios';

// 用户信息类型
export interface UserInfo {
  nickname: string;
  phone: string;
  email: string;
  gender: string;
}

// 密码表单类型
export interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}
</script>

<style scoped>
.profile-container {
  background-color: #f5f7fa;
  min-height: calc(100vh - 60px);
  padding: 20px;
}

.profile-header {
  background: white;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.profile-header h2 {
  margin: 0;
  font-size: 18px;
  color: #303133;
}

.profile-content {
  background: white;
  padding: 20px;
  border-radius: 8px;
}

.profile-section {
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e4e7ed;
}

.profile-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.section-title {
  font-size: 16px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 20px;
}

.info-row {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.info-label {
  width: 120px;
  color: #606266;
}

.info-value {
  flex: 1;
  color: #303133;
}

.avatar-uploader {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.avatar-upload {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.avatar {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  object-fit: cover;
  margin-bottom: 10px;
}

.avatar-uploader-icon {
  font-size: 28px;
  color: #8c939d;
  width: 120px;
  height: 120px;
  line-height: 120px;
  text-align: center;
  border: 1px dashed #d9d9d9;
  border-radius: 50%;
  margin-bottom: 10px;
}

.upload-tips {
  color: #909399;
  font-size: 14px;
}

.is-loading {
  animation: rotating 2s linear infinite;
}

@keyframes rotating {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>