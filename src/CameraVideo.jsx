import { useCallback, useEffect, useRef, useState } from "react";
import cls from "classnames";
import { sharpen } from "./preprocess";

const VideoStatus = {
  INIT: 0,
  PLAYING: 1,
  STOPED: 2,
};

const CameraVideo = ({ process, rects }) => {
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
    const transformedWidth = width * widthRatio, transformedHeight = height * heightRatio;
    canvasEl.width = transformedWidth;
    canvasEl.height = transformedHeight;
    context.drawImage(
      videoEl,
      originLeft,
      originTop,
      transformedWidth,
      transformedHeight,
      0,
      0,
      transformedWidth,
      transformedHeight,
    );
    sharpen(context, transformedWidth, transformedHeight);
    const sharedImageData = context.getImageData(0, 0, transformedWidth, transformedHeight);
    const promise = process(sharedImageData);
    if (promise) {
      processingRef.current = true;
      promise.finally(() => (processingRef.current = false));
    } else {
      processingRef.current = true;
    }
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

  useEffect(() => {
    const canvasEl = canvasElRef.current;
    if (!canvasEl) return;
    const context = canvasEl.getContext("2d");
    if (!rects?.length) {
      context.clearRect(0, 0, canvasEl.width, canvasEl.height);
    } else {
      context.save();
      for (const { left, top, width, height } of rects) {
        context.beginPath();
        context.moveTo(left, top);
        context.lineTo(left + width, top);
        context.lineTo(left + width, top + height);
        context.lineTo(left, top + height);
        context.lineTo(left, top);
        context.strokeStyle = "red";
        context.stroke();
      }
      context.restore();
    }
  }, [rects]);

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
