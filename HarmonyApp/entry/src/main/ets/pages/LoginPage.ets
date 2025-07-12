import { router } from '@kit.ArkUI';
import { CourseRequestUtils } from '../utils/CourseRequestUtils'; // 根据路径调整


@Builder
export function LoginPageBuilder(name: string, param: string) {
  LoginPage()
}

interface LoginFormData {
  username: string;
  password: string;
}


@Entry
@Component
@Preview
struct LoginPage {
  @Consume('pageInfos') pageInfos!: NavPathStack;
  @State loginForm: LoginFormData = {
    username: '',
    password: ''
  };
  @State isLoading: boolean = false;
  @State showPassword: boolean = false;
  @State errorMessage: string = '';

  // 登录方法
  private async handleLogin(): Promise<void> {
    // 基本验证
    if (!this.loginForm.username.trim()) {
      this.errorMessage = '请输入用户名';
      return;
    }
    if (!this.loginForm.password.trim()) {
      this.errorMessage = '请输入密码';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      console.log("在Page进入login")
      // 模拟登录请求
      await CourseRequestUtils.login(this.loginForm.username, this.loginForm.password);

      this.pageInfos.pushPath({ name: "CoursePage" });
      // 登录成功，跳转到主页
    } catch (error) {
      this.errorMessage = error instanceof Error ? error.message : '登录失败，请重试';
    } finally {
      this.isLoading = false;
    }
  }

  // 模拟登录请求
  private simulateLogin(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        // 简单的用户名密码验证
        if (this.loginForm.username === 'admin' && this.loginForm.password === '123456') {
          resolve();
        } else {
          reject(new Error('用户名或密码错误'));
        }
      }, 1000);
    });
  }

  build() {
    NavDestination() {
      Column() {
        // 顶部空间
        Blank().height(60)

        // Logo区域
        Column() {
          Image($r('app.media.startIcon'))
            .width(80)
            .height(80)
            .borderRadius(40)
            .margin({ bottom: 16 })

          Text('欢迎回来')
            .fontSize(28)
            .fontWeight(FontWeight.Bold)
            .fontColor('#1a1a1a')
            .margin({ bottom: 8 })

          Text('请登录您的账户')
            .fontSize(16)
            .fontColor('#666666')
            .margin({ bottom: 40 })
        }
        .alignItems(HorizontalAlign.Center)

        // 登录表单
        Column({ space: 20 }) {
          // 用户名输入框
          Column({ space: 8 }) {
            Text('用户名')
              .fontSize(14)
              .fontColor('#333333')
              .alignSelf(ItemAlign.Start)

            TextInput({ placeholder: '请输入用户名' })
              .height(50)
              .backgroundColor('#f5f5f5')
              .borderRadius(12)
              .padding({ left: 16, right: 16 })
              .fontSize(16)
              .placeholderColor('#999999')
              .onChange((value: string) => {
                this.loginForm.username = value;
                this.errorMessage = '';
              })
          }
          .alignItems(HorizontalAlign.Start)

          // 密码输入框
          Column({ space: 8 }) {
            Text('密码')
              .fontSize(14)
              .fontColor('#333333')
              .alignSelf(ItemAlign.Start)

            Row() {
              TextInput({ placeholder: '请输入密码' })
                .type(this.showPassword ? InputType.Normal : InputType.Password)
                .backgroundColor('transparent')
                .border({ width: 0 })
                .fontSize(16)
                .placeholderColor('#999999')
                .layoutWeight(1)
                .onChange((value: string) => {
                  this.loginForm.password = value;
                  this.errorMessage = '';
                })

              Button({ type: ButtonType.Normal }) {
                Image(this.showPassword ? $r('app.media.ic_arrow_back') : $r('app.media.ic_folder_open'))
                  .width(20)
                  .height(20)
                  .fillColor('#999999')
              }
              .backgroundColor('transparent')
              .width(40)
              .height(40)
              .onClick(() => {
                this.showPassword = !this.showPassword;
              })
            }
            .height(50)
            .backgroundColor('#f5f5f5')
            .borderRadius(12)
            .padding({ left: 16, right: 8 })
          }
          .alignItems(HorizontalAlign.Start)

          // 错误信息
          if (this.errorMessage) {
            Text(this.errorMessage)
              .fontSize(14)
              .fontColor('#ff4757')
              .margin({ top: 4 })
              .alignSelf(ItemAlign.Start)
          }
        }
        .width('100%')
        .padding({ left: 24, right: 24 })

        Blank().height(40)

        // 登录按钮
        Button(this.isLoading ? '登录中...' : '登录')
          .width('100%')
          .height(50)
          .backgroundColor('#007AFF')
          .borderRadius(12)
          .fontSize(16)
          .fontColor(Color.White)
          .fontWeight(FontWeight.Medium)
          .enabled(!this.isLoading)
          .opacity(this.isLoading ? 0.7 : 1.0)
          .margin({ left: 24, right: 24 })
          .onClick(() => {
            this.handleLogin();
          })

        Blank().height(30)

        Blank().height(30)

        Blank()

      }
      .width('100%')
      .height('100%')
      .backgroundColor('#ffffff')
    }
    .title('登录')
    .hideTitleBar(true)
    .backgroundColor('#ffffff')
  }
}