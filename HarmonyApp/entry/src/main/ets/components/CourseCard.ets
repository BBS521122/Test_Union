import { CourseInfo } from "../interface/CourseInfo"

@Component
export struct CourseCard {
  @Prop course: CourseInfo

  onTap?: () => void


  build() {
    Column() {
      // Cover image section
      Image(this.course.coverUrl)
        .width('100%')
        .height('60%')
        .objectFit(ImageFit.Cover)
        .borderRadius({
          topLeft: 12,
          topRight: 12
        })
        .onError(() => {
          // Handle image load error - show fallback
          console.log('Image load failed for: ' + this.course.coverUrl);
        }) // Fallback image resource

      // Content section
      Column() {
        // Title section
        Text(this.course.title)
          .fontSize(12)
          .fontWeight(FontWeight.Bold)
          .fontColor(Color.Black)
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
          .width('100%')
          .textAlign(TextAlign.Start)
          .margin({ bottom: 2 })

        // // Creator section
        // Text(this.creator)
        //   .fontSize(10)
        //   .fontColor(Color.Grey)
        //   .maxLines(1)
        //   .textOverflow({ overflow: TextOverflow.Ellipsis })
        //   .width('100%')
        //   .textAlign(TextAlign.Start)
        //   .layoutWeight(1) // Take remaining space

        // Footer section
        Row() {
          Blank() // Push text to right
          Text(this.course.creator)
            .fontSize(10)
            .fontColor('#999999')
        }
        .width('100%')
        .height(20) // Fixed height for footer
      }
      .width('100%')
      .layoutWeight(1) // Take remaining height after image
      .padding(12)
      .alignItems(HorizontalAlign.Start)
      .justifyContent(FlexAlign.SpaceBetween)
    }
    .width('100%')
    .height('100%')
    .backgroundColor(Color.White)
    .borderRadius(12)
    .shadow({
      radius: 8,
      color: 'rgba(0, 0, 0, 0.1)',
      offsetX: 0,
      offsetY: 2
    })
    .onClick(() => {
      if (this.onTap) {
        this.onTap();
      }
    })
  }
}

