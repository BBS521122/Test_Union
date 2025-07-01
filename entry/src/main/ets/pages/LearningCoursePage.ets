import { CourseData, VideoItem, VideoProgress } from "../interface/CourseInfo";
import { CourseRequestUtils } from "../utils/CourseRequestUtils";
import router from "@ohos.router";

@Builder
export function LearningCoursePageBuilder(name:string, param:string){
  LearningCoursePage()
}

@Component
@Entry
export struct LearningCoursePage {
  @Consume('pageInfos') pageInfos!: NavPathStack;
  courseId: string = '';
  @State courseData: CourseData | null = null;
  @State currentVideoIndex: number = 0;
  @State isLoading: boolean = true;
  @State errorMessage: string = '';
  @State currentTime: number = 0;
  @State duration: number = 0;
  @State isPlaying: boolean = false;

  // 视频控制器
  private videoController: VideoController = new VideoController();
  private progressUpdateTimer: number = -1;



  // aboutToAppear() {
  //  this.loadCourseData();
  // }

  aboutToDisappear() {
    this.clearProgressTimer();
  }

  // 加载课程数据
  private async loadCourseData() {
    if (!this.courseId) {
      this.errorMessage = '课程ID不能为空';
      this.isLoading = false;
      return;
    }

    try {
      this.isLoading = true;
      this.courseData = await CourseRequestUtils.getCourseData(this.courseId);
      this.isLoading = false;
    } catch (error) {
      this.errorMessage = '加载课程数据失败';
      this.isLoading = false;
      console.error('加载课程数据失败:', error);
    }
  }

  // 切换视频
  private changeVideo(index: number) {
    if (this.courseData && index >= 0 && index < this.courseData.list.length) {
      // 保存当前视频的播放进度
      this.saveCurrentProgress();

      this.currentVideoIndex = index;
      this.currentTime = 0;
      this.duration = 0;

      // 重新开始播放新视频
      this.videoController.start();
      this.startProgressTracking();
    }
  }

  // 保存当前播放进度
  private saveCurrentProgress() {
    if (this.courseData && this.duration > 0) {
      const progress: VideoProgress = {
        videoIndex: this.currentVideoIndex,
        currentTime: this.currentTime,
        duration: this.duration
      };

      try {
        CourseRequestUtils.updateVideoProgress(this.courseId, progress)
      } catch (error) {
        console.error('保存播放进度失败:', error);
      }
    }
  }

  // 开始进度跟踪
  private startProgressTracking() {
    this.clearProgressTimer();
    this.progressUpdateTimer = setInterval(() => {
      if (this.isPlaying) {
        this.saveCurrentProgress();
      }
    }, 5000); // 每5秒保存一次进度
  }

  // 清除进度定时器
  private clearProgressTimer() {
    if (this.progressUpdateTimer !== -1) {
      clearInterval(this.progressUpdateTimer);
      this.progressUpdateTimer = -1;
    }
  }

  // 视频播放事件
  private onVideoStart() {
    this.isPlaying = true;
    this.startProgressTracking();
  }

  // 视频暂停事件
  private onVideoPause() {
    this.isPlaying = false;
    this.saveCurrentProgress();
  }

  // 视频结束事件
  private onVideoFinish() {
    this.isPlaying = false;
    this.saveCurrentProgress();

    // 自动播放下一个视频
    if (this.courseData && this.currentVideoIndex < this.courseData.list.length - 1) {
      this.changeVideo(this.currentVideoIndex + 1);
    }
  }

  // 时间更新事件
  // 使用 ArkTS Video 组件实际返回的类型 PlaybackInfo
  private onTimeUpdate(event: PlaybackInfo) {
    this.currentTime = event.time;
  }

  // 视频准备完成事件
  private onVideoPrepared(event: PreparedInfo) {
    this.duration = event.duration;
  }

  build() {
    NavDestination(){
      Column() {
        // 头部标题栏
        Row() {
          Image($r('app.media.ic_arrow_back'))
            .width(24)
            .height(24)
            .margin({ left: 16 })
            .onClick(() => {
              this.pageInfos.pop()
            })

          Text('Leming WebRunner')
            .fontSize(18)
            .fontColor(Color.White)
            .fontWeight(FontWeight.Medium)
            .margin({ left: 16 })
            .layoutWeight(1)
        }
        .width('100%')
        .height(56)
        .backgroundColor('#4285F4')
        .justifyContent(FlexAlign.Start)
        .alignItems(VerticalAlign.Center)

        if (this.isLoading) {
          // 加载状态
          Column() {
            LoadingProgress()
              .width(50)
              .height(50)
              .color('#4285F4')

            Text('加载中...')
              .fontSize(16)
              .fontColor('#666666')
              .margin({ top: 16 })
          }
          .width('100%')
          .height('100%')
          .justifyContent(FlexAlign.Center)
          .alignItems(HorizontalAlign.Center)

        } else if (this.errorMessage) {
          // 错误状态
          Column() {
            Text(this.errorMessage)
              .fontSize(16)
              .fontColor('#FF4444')
          }
          .width('100%')
          .height('100%')
          .justifyContent(FlexAlign.Center)
          .alignItems(HorizontalAlign.Center)

        } else if (this.courseData) {
          // 主要内容
          Column() {
            // 视频播放器
            Video({
              src: this.courseData.list[this.currentVideoIndex]?.videoUrl || '',
              controller: this.videoController
            })
              .width('100%')
              .height(200)
              .backgroundColor('#1a1a2e')
              .controls(true)
              .autoPlay(false)
              .objectFit(ImageFit.Contain)
              .onStart(() => this.onVideoStart())
              .onPause(() => this.onVideoPause())
              .onFinish(() => this.onVideoFinish())
              .onUpdate((event) => this.onTimeUpdate(event))
              .onPrepared((event) => this.onVideoPrepared(event))

            // 课程信息
            Column() {
              Text('【课程简介】')
                .fontSize(18)
                .fontWeight(FontWeight.Bold)
                .fontColor('#333333')
                .alignSelf(ItemAlign.Start)
                .margin({ top: 20, bottom: 10 })

              Text(this.courseData.description)
                .fontSize(14)
                .fontColor('#666666')
                .lineHeight(20)
                .textAlign(TextAlign.Start)
                .width('100%')

              Text('【课程目录】')
                .fontSize(18)
                .fontWeight(FontWeight.Bold)
                .fontColor('#333333')
                .alignSelf(ItemAlign.Start)
                .margin({ top: 20, bottom: 10 })

              // 视频列表
              List() {
                ForEach(this.courseData.list, (item: VideoItem, index: number) => {
                  ListItem() {
                    Row() {
                      Text(`第${index + 1}节`)
                        .fontSize(14)
                        .fontColor('#666666')
                        .width(60)

                      Text(item.name)
                        .fontSize(14)
                        .fontColor(this.currentVideoIndex === index ? '#4285F4' : '#333333')
                        .fontWeight(this.currentVideoIndex === index ? FontWeight.Bold : FontWeight.Normal)
                        .layoutWeight(1)
                        .textAlign(TextAlign.Start)

                      if (this.currentVideoIndex === index) {
                        Text('播放中')
                          .fontSize(12)
                          .fontColor('#4285F4')
                          .backgroundColor('#E3F2FD')
                          .padding({
                            left: 8,
                            right: 8,
                            top: 4,
                            bottom: 4
                          })
                          .borderRadius(12)
                      }
                    }
                    .width('100%')
                    .height(48)
                    .padding({ left: 16, right: 16 })
                    .onClick(() => this.changeVideo(index))
                  }
                  .backgroundColor(this.currentVideoIndex === index ? '#F5F5F5' : Color.White)
                })
              }
              .width('100%')
              .layoutWeight(1)
              .divider({ strokeWidth: 1, color: '#F0F0F0' })
            }
            .width('100%')
            .padding({ left: 16, right: 16 })
            .layoutWeight(1)
          }
          .width('100%')
          .height('100%')
        }
      }
      .width('100%')
      .height('100%')
      .backgroundColor('#FFFFFF')
    }
    .hideTitleBar(true)
    .onReady((context: NavDestinationContext) => {
      let pageParam = context.pathInfo.param as string;
      console.log(`课程ID: ${pageParam}`);
      this.courseId = pageParam;
      this.loadCourseData()
    })

  }
}