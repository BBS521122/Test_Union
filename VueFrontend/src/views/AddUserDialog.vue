<template>
  <el-dialog v-model="visible" title="添加用户" width="800px">
    <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
      <el-row :gutter="20">
        <!-- 用户昵称 -->
        <el-col :span="12">
          <el-form-item label="用户昵称" prop="nickname">
            <el-input v-model="form.nickname" placeholder="请输入用户昵称"/>
          </el-form-item>
        </el-col>

        <!-- 用户名 -->
        <el-col :span="12">
          <el-form-item label="用户名" prop="name">
            <el-input v-model="form.name" placeholder="请输入用户名"/>
          </el-form-item>
        </el-col>

        <!-- 手机号 -->
        <el-col :span="12">
          <el-form-item label="手机号" prop="phone">
            <el-input v-model="form.phone" placeholder="请输入手机号"/>
          </el-form-item>
        </el-col>

        <!-- 用户密码 -->
        <el-col :span="12">
          <el-form-item label="用户密码" prop="password">
            <el-input
                v-model="form.password"
                type="password"
                show-password
                placeholder="请输入密码"
            />
          </el-form-item>
        </el-col>

        <!-- 归属部门 -->
        <el-col :span="12">
          <el-form-item label="归属部门" prop="department">
            <el-select v-model="form.department" placeholder="请选择归属部门">
              <el-option label="研发部" value="研发部"/>
              <el-option label="测试部" value="测试部"/>
            </el-select>
          </el-form-item>
        </el-col>

        <!-- 邮箱 -->
        <el-col :span="12">
          <el-form-item label="邮箱" prop="email">
            <el-input v-model="form.email" placeholder="请输入邮箱"/>
          </el-form-item>
        </el-col>

        <!-- 用户性别 -->
        <el-col :span="12">
          <el-form-item label="用户性别" prop="gender">
            <el-select v-model="form.gender" placeholder="请选择">
              <el-option label="男" value="男"/>
              <el-option label="女" value="女"/>
            </el-select>
          </el-form-item>
        </el-col>

        <!-- 状态 -->
        <el-col :span="12">
          <el-form-item label="状态" prop="state">
            <el-radio-group v-model="form.state">
              <el-radio label="正常"/>
              <el-radio label="停用"/>
            </el-radio-group>
          </el-form-item>
        </el-col>

        <!-- 岗位 -->
        <el-col :span="12">
          <el-form-item label="岗位" prop="post">
            <el-select v-model="form.post" placeholder="请选择">
              <el-option label="前端" value="前端"/>
              <el-option label="后端" value="后端"/>
            </el-select>
          </el-form-item>
        </el-col>

        <!-- 角色 -->
        <el-col :span="12">
          <el-form-item label="角色" prop="role">
            <el-select v-model="form.role" placeholder="请选择">
              <el-option label="管理员" value="admin"/>
              <el-option label="用户" value="user"/>
            </el-select>
          </el-form-item>
        </el-col>

        <!-- 备注 -->
        <!--        <el-col :span="24">-->
        <!--          <el-form-item label="备注" prop="remark">-->
        <!--            <el-input v-model="form.remark" type="textarea" placeholder="请输入内容"/>-->
        <!--          </el-form-item>-->
        <!--        </el-col>-->
      </el-row>
    </el-form>

    <!-- 底部按钮 -->
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import {ref} from 'vue'
import {ElMessage} from 'element-plus'
import axios from "axios";

const visible = ref(false)
const formRef = ref()

const form = ref({
  id: '',
  name: '',
  gender: '',
  password: '',
  state: '正常',
  department: '',
  email: '',
  time: '',
  phone: '',
  role: '',
  post: '',
  photo: '',
  nickname: '',
})

const rules = {
  nickname: [{required: true, message: '请输入用户昵称', trigger: 'blur'}],
  name: [{required: true, message: '请输入用户名', trigger: 'blur'}],
  password: [{required: true, message: '请输入密码', trigger: 'blur'}]
}

const open = () => {
  visible.value = true
}

const handleSubmit = () => {
  formRef.value.validate(async (valid) => {
    if (valid) {
      const response = await axios.post('/admin/add-user', form.value)
      // 检查返回状态码
      if (response.data.code === 200) {
        ElMessage.success('添加用户成功')
        visible.value = false
      } else {
        console.error('添加用户失败：', response)
        ElMessage.error(response.data.message || '添加用户失败') // 显示后端返回的错误信息
      }
    }
  })
}


defineExpose({open})
</script>
