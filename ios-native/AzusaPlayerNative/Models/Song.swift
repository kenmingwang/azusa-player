import Foundation

struct Song: Codable, Identifiable, Equatable {
    var id: String { cid }
    let bvid: String
    let cid: String
    let name: String
    let singer: String
    let cover: String
    var musicSrc: String
}

struct PlayerSettings: Codable {
    var loopMode: LoopMode = .order

    enum LoopMode: String, Codable {
        case order
        case singleLoop
        case shuffle
    }
}
