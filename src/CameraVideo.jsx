import { useCallback, useEffect, useRef, useState } from "react";
import cls from "classnames";
// import { sharpen } from "./preprocess";

const VideoStatus = {
  INIT: 0,
  PLAYING: 1,
  STOPED: 2,
};

const CameraVideo = ({ recognize }) => {
  const videoElRef = useRef(null);
  const innerFrameElRef = useRef(null);
  const canvasElRef = useRef(null);
  const processingRef = useRef(false);
  const videoStatusRef = useRef(VideoStatus.INIT);
  const [wrapperSize, setWrapperSize] = useState(null);

  const scan = useCallback(() => {
    if (processingRef.current) return;
    const videoEl = videoElRef.current;
    if (!videoEl) return;
    const canvasEl = canvasElRef.current;
    if (!canvasEl) return;
    const context = canvasEl.getContext("2d");
    if (!context) return;
    const innerFrameEl = innerFrameElRef.current;
    if (!innerFrameEl) return;
    const innerFrameBounding = innerFrameEl.getBoundingClientRect();
    const wrapperBounding = innerFrameEl.parentElement?.getBoundingClientRect();
    if (!wrapperBounding) return;
    // Here we need to record image from video stream, so we need to calulate the ration between the video stream and video in dom element,
    // because generally the size of video playing in the page is smaller than the raw video stream
    const videoSize = {
      width: videoEl.videoWidth,
      height: videoEl.videoHeight,
    };
    const { width: widthRatio, height: heightRatio } = getVideo2DOMEleSizeRatio(
      videoSize,
      wrapperBounding,
    );
    const originLeft =
      (innerFrameBounding.left - wrapperBounding.left) * widthRatio;
    const originTop =
      (innerFrameBounding.top - wrapperBounding.top) * heightRatio;
    const { width, height } = innerFrameBounding;
    context.imageSmoothingEnabled = false;
    context.drawImage(
      videoEl,
      originLeft,
      originTop,
      width * widthRatio,
      height * heightRatio,
      0,
      0,
      width,
      height,
    );
    // sharpen(context, width, height);
    const sharoedImageData = context.getImageData(0, 0, width, height);
    const image = new Image();
    image.onload = () => {
      const promise = recognize(sharoedImageData, image);
      if (promise) {
        processingRef.current = true;
        promise.finally(() => (processingRef.current = false));
      } else {
        processingRef.current = false;
      }
    }
    image.onabort = console.error;
    const imageSrc = canvasEl.toDataURL("image/png", 1.0);
    image.src = imageSrc;
  }, []);

  useEffect(() => {
    const videoEl = videoElRef.current;
    if (!videoEl) return;
    videoEl.addEventListener(
      "canplay",
      () => {
        if (videoStatusRef.current === VideoStatus.INIT) return;
        const width = 320;
        const ratio = videoEl.videoWidth / width;
        const height = videoEl.videoHeight / ratio;
        videoEl.setAttribute("width", width.toString());
        videoEl.setAttribute("height", height.toString());
        setWrapperSize({ width, height });
      },
      false,
    );
    navigator.mediaDevices
      .getUserMedia({ audio: false, video: { facingMode: "environment" } })
      .then((stream) => {
        videoEl.srcObject = stream;
        videoEl.play();
        videoStatusRef.current = VideoStatus.PLAYING;
        const id = setInterval(scan, 800);
      })
      .catch(console.error);
  }, []);

  const playing = videoStatusRef.current === VideoStatus.PLAYING;
  const wrapperStyle = wrapperSize
    ? { width: `${wrapperSize.width}px`, height: `${wrapperSize.height}px` }
    : undefined;
    
  return (
    <div className="cameraVideoWrapper" style={wrapperStyle}>
      <video ref={(el) => (videoElRef.current = el)}>
        Video is not supported in this browser
      </video>
      <div
        className={cls("innerFrame", playing ? "active" : null)}
        ref={(el) => (innerFrameElRef.current = el)}
      ></div>
      <canvas
        ref={(el) => (canvasElRef.current = el)}
        width="164"
        height="44"
      />
    </div>
  );
};

export default CameraVideo;

function getVideo2DOMEleSizeRatio(videoSize, domElementSize) {
  return {
    width: videoSize.width / domElementSize.width,
    height: videoSize.height / domElementSize.height,
  };
}
