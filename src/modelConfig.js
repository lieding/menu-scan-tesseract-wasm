export const DET_MEAN = 0.785;
export const DET_STD = 0.275;

// Recognition cfg

export const REC_MEAN = 0.694;
export const REC_STD = 0.298;

export const RECO_CONFIG = {
  crnn_mobilenet_v2: {
    value: "crnn_mobilenet_v2",
    label: "CRNN (Mobilenet V2)",
    height: 32,
    width: 128,
    path: "/models/crnn_mobilenet_v2/model.json",
  },
};

// export const VOCAB =
//   "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~°£€¥¢฿àâéèêëîïôùûüçÀÂÉÈÊËÎÏÔÙÛÜÇ";

export const VOCAB = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~°£€¥¢฿àâéèêëîïôùûüçæœÀÂÉÈÊËÎÏÔÙÛÜÇÆŒ";