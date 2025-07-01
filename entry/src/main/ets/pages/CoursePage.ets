import { CourseCard } from "../components/CourseCard";
import { CourseInfo } from "../interface/CourseInfo";
import { CourseRequestUtils } from "../utils/CourseRequestUtils";

@Builder
export function CoursePageBuilder(){
  CoursePage()
}


@Component
@Entry
export struct CoursePage {
  @Consume('pageInfos') pageInfos!: NavPathStack;
  @State courseList: CourseInfo[] = [];
  @State searchText: string = '';
  @State isLoading: boolean = false;

  build() {
    NavDestination(){
      Column() {
        // Top bar
        this.buildTopBar()

        // Search bar
        Column() {
          this.buildSearchBar()
        }.padding({ left: 16, right: 16 })

        // Content area
        Scroll() {
          Column() {
            this.buildCourseGrid()

            Blank() // 用来占位填满剩余空间
              .layoutWeight(1)

            this.buildBottomDescription()
          }
          .padding({ left: 16, right: 16 })
          .height('100%') // 👈 关键：Column 要占满 Scroll 高度
        }
        .layoutWeight(1)
        .scrollBar(BarState.Off)
      }
      .width('100%')
      .height('100%')
      .backgroundColor('#f5f5f5')
    }

  }

  @Builder
  buildTopBar() {
    Row() {
      Text('技术')
        .fontSize(18)
        .fontWeight(FontWeight.Medium)
        .fontColor(Color.White)
    }
    .width('100%')
    .height(56)
    .padding({ left: 16, right: 16 })
    .backgroundColor("#4285F4")
    .justifyContent(FlexAlign.Center)
  }

  @Builder
  buildSearchBar() {
    Row() {
      Image($r('app.media.ic_search'))
        .width(20)
        .height(20)
        .fillColor('#999999')
        .margin({ right: 8 })

      TextInput({
        placeholder: '请搜索课程名称',
        text: this.searchText
      })
        .layoutWeight(1)
        .height(40)
        .backgroundColor(Color.Transparent)
        .border({ width: 0 })
        .placeholderColor('#999999')
        .fontSize(14)
        .onChange((value: string) => {
          this.searchText = value;
          this.onSearchTextChanged(value);
        })
    }
    .width('100%')
    .height(56)
    .padding({ left: 16, right: 16 })
    .backgroundColor(Color.White)
    .borderRadius(8)
    .margin({
      left: 16,
      right: 16,
      top: 12,
      bottom: 12
    })
    .shadow({
      radius: 4,
      color: '#1f000000',
      offsetX: 0,
      offsetY: 2
    })
  }

  @Builder
  buildCourseGrid() {
    if (this.isLoading) {
      Row() {
        LoadingProgress()
          .width(40)
          .height(40)
          .color($r('sys.color.ohos_id_color_primary'))
      }
      .width('100%')
      .height(450)
      .justifyContent(FlexAlign.Center)
    } else if (this.courseList.length === 0) {
      Column() {
        Image($r('app.media.ic_folder_open'))
          .width(60)
          .height(60)
          .fillColor('#cccccc')
          .margin({ bottom: 12 })

        Text('暂无相关课程')
          .fontSize(16)
          .fontColor('#666666')
      }
      .width('100%')
      .height(450)
      .justifyContent(FlexAlign.Center)
    } else {
      Grid() {
        ForEach(this.courseList, (item: CourseInfo, index: number) => {
          GridItem() {
            CourseCard({
              course: item,
              onTap: () => {
                console.log(`Course ${item.id} tapped`);
                this.pageInfos.pushPath({ name: "LearningCoursePage", param: item.id });
              }
            })
          }
        }, (item: CourseInfo) => item.id.toString())
      }
      .columnsTemplate('1fr 1fr')
      .rowsTemplate('1fr 1fr 1fr')
      .columnsGap(10)
      .rowsGap(10)
      .width('100%')
      .height(450)
      .margin({ top: 8 })
    }
  }

  @Builder
  buildBottomDescription() {
    if (this.courseList.length > 0) {
      Column() {
        Divider()
          .color('#e5e5e5')
          .margin({ top: 20, bottom: 16 })

        Text('没有更多数据了')
          .fontSize(14)
          .fontColor('#999999')
          .textAlign(TextAlign.Center)
          .margin({ bottom: 32 })
      }
      .width('100%')
    }
  }

  aboutToAppear(): void {
    this.fetchCourseList();
  }

  private async fetchCourseList(query: string = ''): Promise<void> {
    try {
      this.isLoading = true;
      this.courseList = await CourseRequestUtils.getCourseList(query);
    } catch (error) {
      console.error('获取课程列表失败:', error);
      // Show error message or retry option
    } finally {
      this.isLoading = false;
    }
  }

  private onSearchTextChanged(value: string): void {
    // Debounce search to avoid too many requests
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.fetchCourseList(value);
    }, 300);
  }

  private searchTimer: number = -1;

  aboutToDisappear(): void {
    if (this.searchTimer !== -1) {
      clearTimeout(this.searchTimer);
    }
  }

}