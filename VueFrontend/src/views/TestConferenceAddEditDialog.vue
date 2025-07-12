<script lang="ts">
import {defineComponent, ref} from 'vue'
import AddEditConferenceDialog from '../components/AddEditConferenceDialog.vue'

/**
 * 展示添加/编辑会议的对话框组件
 * 不可用于生产环境，主要用于测试对话框的功能
 */
export default defineComponent({
  name: "TestView",
  components: {AddConferenceDialog: AddEditConferenceDialog},
  setup() {
    const showDialog = ref(false)
    const dialogId = ref<number | undefined>(undefined)

    const openDialog = (id?: number) => {
      dialogId.value = id
      showDialog.value = true
    }

    return {showDialog, dialogId, openDialog}
  }
})
</script>

<template>
  <el-button @click="openDialog()">不传id</el-button>
  <el-button @click="openDialog(1)">传id=1</el-button>
  <add-conference-dialog v-model="showDialog" :conference-id="dialogId" />
</template>

<style scoped>
</style>