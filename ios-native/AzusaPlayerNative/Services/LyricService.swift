import Foundation

enum LyricService {
    private static let mappingURL = URL(string: "https://raw.githubusercontent.com/kenmingwang/azusa-player-lrcs/main/mappings.txt")!
    private static let lrcBase = "https://raw.githubusercontent.com/kenmingwang/azusa-player-lrcs/main/%@"
    private static let qqSearch = "https://c.y.qq.com/splcloud/fcgi-bin/smartbox_new.fcg?key=%@"
    private static let qqLyric = "https://i.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg?songmid=%@&g_tk=5381&format=json&inCharset=utf8&outCharset=utf-8&nobase64=1"

    static func extractSongName(_ name: String) -> String {
        if let r = name.range(of: "《.*》", options: .regularExpression) {
            return String(name[r]).trimmingCharacters(in: CharacterSet(charactersIn: "《》"))
        }
        return sanitizeKeyword(name)
    }

    static func fetchLyric(songName: String) async -> String {
        let rawKey = extractSongName(songName)
        let key = sanitizeKeyword(rawKey)
        AppLogger.info("lyric fetch start key=\(key)")

        do {
            let mapped = try await fetchMappedLrc(key: key)
            if !mapped.isEmpty {
                AppLogger.info("lyric fetch used mapped lrc")
                return mapped
            }
        } catch {
            AppLogger.error("lyric mapped fetch error: \(error.localizedDescription)")
        }

        do {
            let qq = try await fetchQQLrcByKeyword(key)
            if !qq.isEmpty {
                AppLogger.info("lyric fetch used qq lrc")
                return qq
            }
        } catch {
            AppLogger.error("lyric qq fetch error: \(error.localizedDescription)")
        }

        AppLogger.error("lyric fetch failed for key=\(key)")
        return "[00:00.000] Lyric not found"
    }

    private static func sanitizeKeyword(_ s: String) -> String {
        var out = s
            .replacingOccurrences(of: "【.*?】", with: "", options: .regularExpression)
            .replacingOccurrences(of: "\\(.*?\\)", with: "", options: .regularExpression)
            .replacingOccurrences(of: "\\[.*?\\]", with: "", options: .regularExpression)
            .replacingOccurrences(of: "v\\d+(\\.\\d+)?", with: "", options: .regularExpression)
            .replacingOccurrences(of: "超绝低音版", with: "")
            .replacingOccurrences(of: "翻唱", with: "")
            .replacingOccurrences(of: "cover", with: "", options: [.regularExpression, .caseInsensitive])

        out = out.trimmingCharacters(in: CharacterSet.whitespacesAndNewlines)
        out = out.replacingOccurrences(of: "\\s+", with: " ", options: NSString.CompareOptions.regularExpression)
        return out.isEmpty ? s : out
    }

    private static func fetchMappedLrc(key: String) async throws -> String {
        let (mapData, _) = try await URLSession.shared.data(from: mappingURL)
        guard let mapText = String(data: mapData, encoding: .utf8) else { return "" }

        let lines = mapText.split(separator: "\n").map(String.init)
        let file = lines.first(where: { $0.localizedCaseInsensitiveContains(key) })
            ?? lines.first(where: { key.localizedCaseInsensitiveContains($0.components(separatedBy: ".").first ?? "") })

        guard let file else { return "" }

        let url = URL(string: String(format: lrcBase, file))!
        let (lrcData, response) = try await URLSession.shared.data(from: url)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else { return "" }
        return (String(data: lrcData, encoding: .utf8) ?? "").replacingOccurrences(of: "\r\n", with: "\n")
    }

    private static func fetchQQLrcByKeyword(_ keyword: String) async throws -> String {
        let encoded = keyword.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
        let searchURL = URL(string: String(format: qqSearch, encoded))!
        let (searchData, _) = try await URLSession.shared.data(from: searchURL)

        let searchRes = try parseSearchResponse(searchData)
        guard let mid = searchRes.data.song.itemlist.first?.mid else { return "" }

        let lyricURL = URL(string: String(format: qqLyric, mid))!
        let (lyricData, _) = try await URLSession.shared.data(from: lyricURL)
        let lyricRes = try parseLyricResponse(lyricData)
        if let lyric = lyricRes.lyric {
            if let trans = lyricRes.trans, !trans.isEmpty {
                return trans + "\n" + lyric
            }
            return lyric
        }
        return ""
    }

    private static func parseSearchResponse(_ data: Data) throws -> QQSearchResponse {
        if let res = try? JSONDecoder().decode(QQSearchResponse.self, from: data) {
            return res
        }

        guard let text = String(data: data, encoding: .utf8),
              let left = text.firstIndex(of: "("),
              let right = text.lastIndex(of: ")"),
              left < right else {
            throw NSError(domain: "Azusa", code: 1001, userInfo: [NSLocalizedDescriptionKey: "QQ search parse failed"])
        }

        let json = String(text[text.index(after: left)..<right])
        guard let jsonData = json.data(using: .utf8) else {
            throw NSError(domain: "Azusa", code: 1002, userInfo: [NSLocalizedDescriptionKey: "QQ search jsonp decode failed"])
        }
        return try JSONDecoder().decode(QQSearchResponse.self, from: jsonData)
    }

    private static func parseLyricResponse(_ data: Data) throws -> QQLyricResponse {
        if let res = try? JSONDecoder().decode(QQLyricResponse.self, from: data) {
            return res
        }

        guard let text = String(data: data, encoding: .utf8),
              let left = text.firstIndex(of: "("),
              let right = text.lastIndex(of: ")"),
              left < right else {
            throw NSError(domain: "Azusa", code: 1003, userInfo: [NSLocalizedDescriptionKey: "QQ lyric parse failed"])
        }

        let json = String(text[text.index(after: left)..<right])
        guard let jsonData = json.data(using: .utf8) else {
            throw NSError(domain: "Azusa", code: 1004, userInfo: [NSLocalizedDescriptionKey: "QQ lyric jsonp decode failed"])
        }
        return try JSONDecoder().decode(QQLyricResponse.self, from: jsonData)
    }
}

private struct QQSearchResponse: Decodable {
    struct DataField: Decodable {
        struct SongField: Decodable {
            struct Item: Decodable { let mid: String }
            let itemlist: [Item]
        }
        let song: SongField
    }
    let data: DataField
}

private struct QQLyricResponse: Decodable {
    let lyric: String?
    let trans: String?
}
