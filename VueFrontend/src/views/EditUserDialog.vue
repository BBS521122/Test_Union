<template>
  <el-dialog v-model="visible" title="修改用户" width="600px">
    <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="用户昵称" prop="nickname" required>
            <el-input v-model="form.nickname" placeholder="请输入用户昵称" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="归属部门" prop="department">
            <el-input v-model="form.department" placeholder="所属部门" disabled />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="手机号" prop="phone">
            <el-input v-model="form.phone" placeholder="请输入手机号" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="邮箱" prop="email">
            <el-input v-model="form.email" placeholder="请输入邮箱" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="用户性别" prop="gender">
            <el-select v-model="form.gender" placeholder="请选择">
              <el-option label="男" value="男" />
              <el-option label="女" value="女" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="状态" prop="status">
            <el-radio-group v-model="form.status">
              <el-radio label="正常" />
              <el-radio label="停用" />
            </el-radio-group>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="岗位" prop="position">
            <el-select v-model="form.position" placeholder="请选择岗位">
              <el-option label="项目经理" value="项目经理" />
              <el-option label="开发工程师" value="开发工程师" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="角色" prop="role">
            <el-select v-model="form.role" placeholder="请选择角色" disabled>
              <el-option label="用户管理员" value="用户管理员" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="备注" prop="remark">
            <el-input v-model="form.remark" type="textarea" placeholder="请输入备注信息" />
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>

    <!-- 底部按钮 -->
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="handleUpdate">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'

const visible = ref(false)
const formRef = ref()

const form = ref({
  id: '', // 编辑时要带上 ID
  nickname: '',
  department: '',
  phone: '',
  email: '',
  gender: '',
  status: '',
  position: '',
  role: '',
  remark: ''
})

const rules = {
  nickname: [{ required: true, message: '请输入用户昵称', trigger: 'blur' }]
}

// ✅ 打开弹窗并加载数据
const open = (userData) => {
  Object.assign(form.value, userData)
  visible.value = true
}

// ✅ 提交修改请求
const handleUpdate = () => {
  formRef.value.validate(async (valid) => {
    if (valid) {
      try {
        // ✅ 与后端交互（发送修改请求）
        // await axios.put(`/api/users/${form.value.id}`, form.value)

        console.log('修改数据：', form.value)

        ElMessage.success('用户信息修改成功')
        visible.value = false
      } catch (err) {
        ElMessage.error('用户信息修改失败')
      }
    }
  })
}

defineExpose({ open })
</script>
