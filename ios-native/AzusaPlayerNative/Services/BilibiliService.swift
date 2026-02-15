import Foundation

struct ImportProgress {
    let phase: String
    let completed: Int
    let total: Int
    let message: String
}

enum BilibiliService {
    private static let playURL = "https://api.bilibili.com/x/player/playurl?cid=%@&bvid=%@&qn=64&fnval=16"
    private static let videoInfoURL = "https://api.bilibili.com/x/web-interface/view?bvid=%@"
    private static let favURL = "https://api.bilibili.com/x/v3/fav/resource/list?media_id=%@&pn=%d&ps=20&keyword=&order=mtime&type=0&tid=0&platform=web&jsonp=jsonp"
    private static let favFoldersByUserURL = "https://api.bilibili.com/x/v3/fav/folder/created/list-all?up_mid=%@&jsonp=jsonp"

    private static let defaultHeaders: [String: String] = [
        "Referer": "https://www.bilibili.com",
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
        "Accept": "application/json,text/plain,*/*"
    ]

    static func parseBvid(_ input: String) -> String? {
        let direct = input.range(of: "BV[0-9A-Za-z]{10}", options: .regularExpression)
        if let direct {
            let bvid = String(input[direct])
            AppLogger.info("parseBvid success: \(bvid)")
            return bvid
        }

        let pattern = "bilibili\\.com/video/(BV[0-9A-Za-z]{10})"
        guard let regex = try? NSRegularExpression(pattern: pattern, options: .caseInsensitive) else { return nil }
        let ns = NSRange(input.startIndex..<input.endIndex, in: input)
        guard let m = regex.firstMatch(in: input, options: [], range: ns), m.numberOfRanges > 1,
              let r = Range(m.range(at: 1), in: input) else { return nil }
        let bvid = String(input[r])
        AppLogger.info("parseBvid success(url): \(bvid)")
        return bvid
    }

    static func parseFavMediaID(_ input: String) -> String? {
        let trimmed = input.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.allSatisfy({ $0.isNumber }) {
            AppLogger.info("parseFavMediaID success(raw digits): \(trimmed)")
            return trimmed
        }

        let patterns = [
            "(?:[?&]fid=|[?&]media_id=|^fid=)(\\d+)",
            "/favlist/(\\d+)"
        ]

        for p in patterns {
            guard let regex = try? NSRegularExpression(pattern: p, options: .caseInsensitive) else { continue }
            let ns = NSRange(trimmed.startIndex..<trimmed.endIndex, in: trimmed)
            guard let m = regex.firstMatch(in: trimmed, options: [], range: ns), m.numberOfRanges > 1,
                  let r = Range(m.range(at: 1), in: trimmed) else {
                continue
            }
            let mediaID = String(trimmed[r])
            AppLogger.info("parseFavMediaID success(regex): \(mediaID)")
            return mediaID
        }

        AppLogger.info("parseFavMediaID miss for input: \(trimmed)")
        return nil
    }

    static func fetchSongs(input: String, onProgress: ((ImportProgress) -> Void)? = nil) async throws -> [Song] {
        AppLogger.info("fetchSongs input: \(input)")
        if let favID = parseFavMediaID(input) {
            AppLogger.info("fetchSongs route=fav id=\(favID)")
            do {
                return try await fetchFavSongs(mediaID: favID, onProgress: onProgress)
            } catch {
                AppLogger.error("fetchFavSongs with mediaID failed, retrying as user id. err=\(error.localizedDescription)")
                let resolvedMediaID = try await resolveFirstFavMediaID(fromUserID: favID)
                AppLogger.info("resolved user id \(favID) -> media_id \(resolvedMediaID)")
                return try await fetchFavSongs(mediaID: resolvedMediaID, onProgress: onProgress)
            }
        }

        guard let bvid = parseBvid(input) else {
            throw NSError(domain: "Azusa", code: 1, userInfo: [NSLocalizedDescriptionKey: "Invalid BVID / URL / fav id"])
        }

        AppLogger.info("fetchSongs route=bvid bvid=\(bvid)")
        let info = try await fetchVideoInfo(bvid: bvid)
        let songs = info.pages.map { page in
            Song(bvid: info.bvid,
                 cid: String(page.cid),
                 name: page.part.isEmpty ? info.title : page.part,
                 singer: info.owner.name,
                 cover: normalizeCoverURL(info.pic),
                 musicSrc: "")
        }
        AppLogger.info("fetchSongs bvid done songs=\(songs.count)")
        return songs
    }

    static func fetchPlayURL(bvid: String, cid: String) async throws -> String {
        let url = URL(string: String(format: playURL, cid, bvid))!
        AppLogger.info("fetchPlayURL start bvid=\(bvid) cid=\(cid)")
        let data = try await requestData(url: url, label: "playurl")

        let res = try JSONDecoder().decode(APIEnvelope<PlayData>.self, from: data)
        guard res.code == 0, let playData = res.data else {
            throw NSError(domain: "Azusa", code: 2, userInfo: [NSLocalizedDescriptionKey: "Play API failed: code=\(res.code), message=\(res.message ?? res.msg ?? "")"])
        }

        if let dash = playData.dash?.audio.first?.baseUrl, !dash.isEmpty {
            AppLogger.info("fetchPlayURL selected dash audio url")
            return normalizeMediaURL(dash)
        }
        if let durl = playData.durl?.first?.url, !durl.isEmpty {
            AppLogger.info("fetchPlayURL selected durl url")
            return normalizeMediaURL(durl)
        }

        throw NSError(domain: "Azusa", code: 3, userInfo: [NSLocalizedDescriptionKey: "No playable audio stream in response"])
    }

    private static func fetchFavSongs(mediaID: String, onProgress: ((ImportProgress) -> Void)? = nil) async throws -> [Song] {
        let first = try await fetchFavPage(mediaID: mediaID, page: 1)
        let mediaCount = first.info.mediaCount
        let totalPages = max(1, Int(ceil(Double(mediaCount) / 20.0)))
        AppLogger.info("fetchFavSongs mediaID=\(mediaID) mediaCount=\(mediaCount) pages=\(totalPages)")

        onProgress?(ImportProgress(
            phase: "favorite_pages",
            completed: 0,
            total: totalPages,
            message: "Fetching favorite pages 0/\(totalPages)"
        ))

        var allBVIDs = first.medias.compactMap { $0.bvid }
        onProgress?(ImportProgress(
            phase: "favorite_pages",
            completed: 1,
            total: totalPages,
            message: "Fetching favorite pages 1/\(totalPages)"
        ))

        if totalPages > 1 {
            for page in 2...totalPages {
                let p = try await fetchFavPage(mediaID: mediaID, page: page)
                allBVIDs += p.medias.compactMap { $0.bvid }
                onProgress?(ImportProgress(
                    phase: "favorite_pages",
                    completed: page,
                    total: totalPages,
                    message: "Fetching favorite pages \(page)/\(totalPages)"
                ))
            }
        }

        AppLogger.info("fetchFavSongs bvidCount=\(allBVIDs.count)")

        var songs: [Song] = []
        var skipped = 0
        let totalBVIDs = max(1, allBVIDs.count)
        var processed = 0
        for bvid in allBVIDs {
            do {
                let info = try await fetchVideoInfo(bvid: bvid)
                songs += info.pages.map { page in
                    Song(bvid: info.bvid,
                         cid: String(page.cid),
                         name: page.part.isEmpty ? info.title : page.part,
                         singer: info.owner.name,
                         cover: normalizeCoverURL(info.pic),
                         musicSrc: "")
                }
            } catch {
                skipped += 1
                AppLogger.error("fetchFavSongs skip bvid=\(bvid), reason=\(error.localizedDescription)")
            }
            processed += 1
            onProgress?(ImportProgress(
                phase: "favorite_songs",
                completed: processed,
                total: totalBVIDs,
                message: "Loading songs \(processed)/\(totalBVIDs) (skipped \(skipped))"
            ))
        }

        AppLogger.info("fetchFavSongs done songs=\(songs.count) skipped=\(skipped)")
        if songs.isEmpty {
            throw NSError(domain: "Azusa", code: 7, userInfo: [NSLocalizedDescriptionKey: "No playable/visible songs in this favorite list"])
        }
        return songs
    }

    private static func fetchVideoInfo(bvid: String) async throws -> VideoInfoData {
        let url = URL(string: String(format: videoInfoURL, bvid))!
        let data = try await requestData(url: url, label: "videoInfo")
        let envelope = try JSONDecoder().decode(APIEnvelope<VideoInfoData>.self, from: data)
        guard envelope.code == 0, let payload = envelope.data else {
            throw NSError(domain: "Azusa", code: 4, userInfo: [NSLocalizedDescriptionKey: "Video info failed: code=\(envelope.code), message=\(envelope.message ?? envelope.msg ?? "")"])
        }
        return payload
    }

    private static func fetchFavPage(mediaID: String, page: Int) async throws -> FavData {
        let url = URL(string: String(format: favURL, mediaID, page))!
        let data = try await requestData(url: url, label: "favList(page=\(page))")
        let envelope = try JSONDecoder().decode(APIEnvelope<FavData>.self, from: data)
        guard envelope.code == 0, let payload = envelope.data else {
            throw NSError(domain: "Azusa", code: 5, userInfo: [NSLocalizedDescriptionKey: "Fav list failed: code=\(envelope.code), message=\(envelope.message ?? envelope.msg ?? "")"])
        }
        return payload
    }

    private static func resolveFirstFavMediaID(fromUserID userID: String) async throws -> String {
        let url = URL(string: String(format: favFoldersByUserURL, userID))!
        let data = try await requestData(url: url, label: "favFolderByUser")
        let envelope = try JSONDecoder().decode(APIEnvelope<FavFolderData>.self, from: data)
        guard envelope.code == 0, let list = envelope.data?.list, let first = list.first else {
            throw NSError(domain: "Azusa", code: 6, userInfo: [NSLocalizedDescriptionKey: "Cannot resolve favorite folder by user id"])
        }
        return String(first.id)
    }

    private static func normalizeCoverURL(_ raw: String) -> String {
        if raw.hasPrefix("http://") {
            return raw.replacingOccurrences(of: "http://", with: "https://")
        }
        return raw
    }

    private static func normalizeMediaURL(_ raw: String) -> String {
        if raw.hasPrefix("http://") {
            return raw.replacingOccurrences(of: "http://", with: "https://")
        }
        return raw
    }

    private static func requestData(url: URL, label: String) async throws -> Data {
        var request = URLRequest(url: url)
        request.timeoutInterval = 20
        defaultHeaders.forEach { request.setValue($0.value, forHTTPHeaderField: $0.key) }

        AppLogger.info("HTTP GET [\(label)] \(url.absoluteString)")
        let (data, response) = try await URLSession.shared.data(for: request)

        let statusCode = (response as? HTTPURLResponse)?.statusCode ?? -1
        AppLogger.info("HTTP [\(label)] status=\(statusCode) bytes=\(data.count)")

        if statusCode >= 400 {
            let body = String(data: data, encoding: .utf8) ?? "<binary>"
            AppLogger.error("HTTP [\(label)] errorBody=\(body)")
            throw NSError(domain: "Azusa", code: statusCode, userInfo: [NSLocalizedDescriptionKey: "HTTP \(statusCode) on \(label)"])
        }

        return data
    }
}

private struct APIEnvelope<T: Decodable>: Decodable {
    let code: Int
    let message: String?
    let msg: String?
    let data: T?
}

private struct PlayData: Decodable {
    struct Dash: Decodable {
        struct Audio: Decodable {
            let baseUrl: String

            enum CodingKeys: String, CodingKey {
                case baseUrl
                case base_url
            }

            init(from decoder: Decoder) throws {
                let c = try decoder.container(keyedBy: CodingKeys.self)
                baseUrl = try c.decodeIfPresent(String.self, forKey: .baseUrl)
                    ?? c.decode(String.self, forKey: .base_url)
            }
        }

        let audio: [Audio]
    }

    struct DUrl: Decodable { let url: String }

    let dash: Dash?
    let durl: [DUrl]?
}

private struct VideoInfoData: Decodable {
    struct Owner: Decodable { let name: String }
    struct Page: Decodable { let cid: Int; let part: String }

    let bvid: String
    let title: String
    let pic: String
    let owner: Owner
    let pages: [Page]
}

private struct FavData: Decodable {
    struct Info: Decodable {
        let mediaCount: Int
        enum CodingKeys: String, CodingKey { case mediaCount = "media_count" }
    }

    struct Media: Decodable { let bvid: String? }

    let info: Info
    let medias: [Media]
}

private struct FavFolderData: Decodable {
    struct Folder: Decodable { let id: Int }
    let list: [Folder]
}
