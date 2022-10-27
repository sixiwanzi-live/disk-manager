import config from "./config.js"

export default {
    server: {
        code: 500101000,
        message: '服务器未知错误'
    },
    auth: {
        Unauthorized: {
            code: 401101000,
            message: '您没有权限使用该功能'
        }
    },
    disk: {
        NotFound: {
            code: 400101100,
            message: '找不到文件'
        },
        BvIllegal: {
            code: 400101101,
            message: 'bv不合法'
        },
        DownloadFailed: {
            code: 500101100,
            message: '下载失败'
        }
    },
    segment: {
        CidNotFound: {
            code: 500101130,
            message: '查询视频cid失败'
        },
        StreamNotFound: {
            code: 500101131,
            message: 'B站接口异常'
        },
        Failed: {
            code: 500101132,
            message: 'FFMPEG生成视频片段失败'
        },
        ExtractAudioFailed: {
            code: 500101133,
            message: 'FFMPEG提取音频失败'
        },
        SlowStream: {
            code: 500101134,
            message: '获取到B站异常源，请重试'
        },
        IntervalTooLong: {
            code: 400101130,
            message: `切片时长不应超过${config.segment.maxInterval}分钟`
        },
        IntervalTooShort: {
            code: 400101131,
            message: `切片时长不应少于1秒钟`
        }
    },
    zimu: {
        ClipNotFound: {
            code: 400101140,
            message: '视频不存在'
        },
        AuthorNotFound: {
            code: 400101141,
            message: '主播不存在'
        }
    }
}