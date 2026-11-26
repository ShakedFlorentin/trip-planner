import UIKit
import Photos
import PhotosUI
import Capacitor

/// Reads the phone's photo library for the trip album. Nothing is copied or uploaded: `list` returns only id, time and
/// location for photos taken between two moments; `thumbnail` and `image` write one small JPEG to the caches folder
/// when the page asks for it (iCloud photos are fetched on demand). JS: `TripPhotos.requestAccess() / status() /
/// list({ from, to }) / thumbnail({ id, size }) / image({ id }) / pickMore() / openSettings()`.
@objc(TripPhotosPlugin)
public class TripPhotosPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "TripPhotosPlugin"
    public let jsName = "TripPhotos"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "requestAccess", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "list", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "thumbnail", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "image", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pickMore", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openSettings", returnType: CAPPluginReturnPromise),
    ]

    /// A trip is a few weeks; a month of photos is a few thousand rows at most. Anything past this is a bad range.
    static let maxRows = 20_000
    static let maxThumb = 1024
    static let maxImage: CGFloat = 2400

    private static func word(_ s: PHAuthorizationStatus) -> String {
        switch s {
        case .authorized: return "full"
        case .limited: return "limited"
        case .notDetermined: return "undetermined"
        default: return "denied"
        }
    }

    private static var folder: URL {
        let url = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0].appendingPathComponent("TripPhotos", isDirectory: true)
        try? FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
        return url
    }

    private static func fileName(_ id: String, _ tag: String) -> String {
        let safe = id.unicodeScalars.map { CharacterSet.alphanumerics.contains($0) ? String($0) : "_" }.joined()
        return "\(safe)-\(tag).jpg"
    }

    private func asset(_ id: String) -> PHAsset? {
        PHAsset.fetchAssets(withLocalIdentifiers: [id], options: nil).firstObject
    }

    @objc func requestAccess(_ call: CAPPluginCall) {
        PHPhotoLibrary.requestAuthorization(for: .readWrite) { s in call.resolve(["status": Self.word(s)]) }
    }

    @objc func status(_ call: CAPPluginCall) {
        call.resolve(["status": Self.word(PHPhotoLibrary.authorizationStatus(for: .readWrite))])
    }

    @objc func list(_ call: CAPPluginCall) {
        guard let from = call.getDouble("from"), let to = call.getDouble("to"), to >= from else {
            return call.reject("from and to (epoch ms) are required")
        }
        let s = PHPhotoLibrary.authorizationStatus(for: .readWrite)
        guard s == .authorized || s == .limited else { return call.resolve(["photos": []]) }
        DispatchQueue.global(qos: .userInitiated).async {
            let opts = PHFetchOptions()
            opts.predicate = NSPredicate(
                format: "mediaType == %d AND creationDate >= %@ AND creationDate <= %@",
                PHAssetMediaType.image.rawValue,
                Date(timeIntervalSince1970: from / 1000) as NSDate,
                Date(timeIntervalSince1970: to / 1000) as NSDate)
            opts.sortDescriptors = [NSSortDescriptor(key: "creationDate", ascending: true)]
            opts.fetchLimit = Self.maxRows
            var rows: [[String: Any]] = []
            PHAsset.fetchAssets(with: opts).enumerateObjects { a, _, _ in
                guard let d = a.creationDate else { return }
                var row: [String: Any] = ["id": a.localIdentifier, "time": d.timeIntervalSince1970 * 1000]
                if let c = a.location?.coordinate, CLLocationCoordinate2DIsValid(c) {
                    row["lat"] = c.latitude
                    row["lng"] = c.longitude
                }
                rows.append(row)
            }
            call.resolve(["photos": rows])
        }
    }

    /// Writes `a` as a JPEG of at most `side` px on its long side (square crop when `square`) and returns its file URL.
    private func render(_ a: PHAsset, side: CGFloat, square: Bool, tag: String, call: CAPPluginCall) {
        let file = Self.folder.appendingPathComponent(Self.fileName(a.localIdentifier, tag))
        if FileManager.default.fileExists(atPath: file.path) { return call.resolve(["url": file.absoluteString]) }
        let o = PHImageRequestOptions()
        o.isNetworkAccessAllowed = true
        o.deliveryMode = .highQualityFormat
        o.resizeMode = .exact
        o.isSynchronous = false
        let target = CGSize(width: side, height: side)
        PHImageManager.default().requestImage(for: a, targetSize: target, contentMode: square ? .aspectFill : .aspectFit, options: o) { img, info in
            if (info?[PHImageResultIsDegradedKey] as? Bool) == true { return }
            guard let img, let data = img.jpegData(compressionQuality: 0.8) else {
                return call.reject("could not read the photo")
            }
            do {
                try data.write(to: file, options: .atomic)
                call.resolve(["url": file.absoluteString])
            } catch {
                call.reject("could not save the preview")
            }
        }
    }

    @objc func thumbnail(_ call: CAPPluginCall) {
        guard let id = call.getString("id"), let a = asset(id) else { return call.reject("photo not found") }
        let size = min(CGFloat(call.getInt("size") ?? 200), CGFloat(Self.maxThumb))
        render(a, side: size, square: true, tag: "t\(Int(size))", call: call)
    }

    @objc func image(_ call: CAPPluginCall) {
        guard let id = call.getString("id"), let a = asset(id) else { return call.reject("photo not found") }
        render(a, side: Self.maxImage, square: false, tag: "full", call: call)
    }

    @objc func pickMore(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let vc = self.bridge?.viewController else { return call.reject("no view") }
            PHPhotoLibrary.shared().presentLimitedLibraryPicker(from: vc) { _ in call.resolve() }
        }
    }

    @objc func openSettings(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            if let url = URL(string: UIApplication.openSettingsURLString) { UIApplication.shared.open(url) }
            call.resolve()
        }
    }
}
