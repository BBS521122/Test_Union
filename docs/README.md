# Q&A
## 1.如何修改全局base url
### 在EntryAbility第11行修改ip和端口号，10.0.2.2指向本地localhost,有需求修改为本地局域网ip或公网ip

## 2.如何实现页面跳转
### 1.子页面根布局必须为 NavDestination，在src/main/resources/base/profile/route_map.json文件中添加路由映射关系,仿照即可，
```json要用@Builder注解写buildFunction
{
"name": "LearningCoursePage",
"pageSourceFile": "src/main/ets/pages/LearningCoursePage.ets",
"buildFunction": "LearningCoursePageBuilder"
}
```
### 实现跳转代码
### 1.获取全局导航栈,此行代码写在组件开头，不必进行任何修改
```
@Consume('pageInfos') pageInfos!: NavPathStack;
```
### 2.跳转代码,需传入路由名称和参数,路由名称对应route_map.json文件中的name字段
```typescript
 this.pageInfos.pushPath({ name: "LearningCoursePage", param: item.id });
```
### 3.如何实现页面获取参数，在页面NavDestination的onReady方法中获取参数,例子：
```
.onReady((context: NavDestinationContext) => {
      let pageParam = context.pathInfo.param as string;
      console.log(`课程ID: ${pageParam}`);
      this.courseId = pageParam;
      this.loadCourseData()
    })
```
# TODO
- [ ] 创建一个登录界面，登录界面传入用户名密码，登录成功后跳转到主页
- [ ] 登录成功后将用户名和密码保存到本地类似Shared prefs中，保存全局token，在CourseRequestUtils所有请求Authorization头部加上token，并请求数据
- [ ] 登录界面初始化时尝试读取存储的name和password,尝试登录，失败则在登录界面，反之无感跳转到主界面
- [ ] 完成CourseLearningPage 中上传用户课程学习进度代码和CourseRequestUtils中向后端课程学习进度代码
- [ ] index 主页面从主页面改为登录界面

