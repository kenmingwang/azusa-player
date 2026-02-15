import Foundation
import os

enum AppLogger {
    private static let logger = Logger(subsystem: "com.kenmingwang.azusaplayer.native", category: "app")

    static func info(_ message: String) {
        logger.info("\(message, privacy: .public)")
        print("[Azusa][INFO] \(message)")
    }

    static func error(_ message: String) {
        logger.error("\(message, privacy: .public)")
        print("[Azusa][ERROR] \(message)")
    }
}
