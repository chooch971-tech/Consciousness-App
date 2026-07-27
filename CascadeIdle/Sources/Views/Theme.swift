import SwiftUI

enum Palette {
    static let void     = Color(red: 0.055, green: 0.055, blue: 0.063)
    static let panel    = Color(red: 0.118, green: 0.118, blue: 0.130)
    static let panelHi  = Color(red: 0.165, green: 0.165, blue: 0.180)
    static let stroke   = Color.white.opacity(0.08)
    static let text     = Color(red: 0.94, green: 0.94, blue: 0.96)
    static let dim      = Color(red: 0.55, green: 0.56, blue: 0.60)
    static let energy   = Color(hue: 0.13, saturation: 0.85, brightness: 1.00)
    static let core     = Color(hue: 0.42, saturation: 0.75, brightness: 0.95)
}

extension Font {
    static func mono(_ size: CGFloat, _ weight: Font.Weight = .semibold) -> Font {
        .system(size: size, weight: weight, design: .rounded).monospacedDigit()
    }
}

/// Flat charcoal, like Revolution Idle — the rings supply all the colour.
struct Backdrop: View {
    var body: some View {
        ZStack {
            Palette.void
            RadialGradient(colors: [Color.white.opacity(0.045), .clear],
                           center: UnitPoint(x: 0.5, y: 0.38),
                           startRadius: 0, endRadius: 420)
        }
        .ignoresSafeArea()
    }
}

/// Standard card chrome.
struct Panel<Content: View>: View {
    var tint: Color = .white
    @ViewBuilder var content: Content

    var body: some View {
        content
            .background(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .fill(Palette.panel)
                    .overlay(
                        RoundedRectangle(cornerRadius: 16, style: .continuous)
                            .fill(
                                LinearGradient(colors: [tint.opacity(0.09), .clear],
                                               startPoint: .topLeading, endPoint: .bottomTrailing)
                            )
                    )
            )
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .strokeBorder(Palette.stroke, lineWidth: 1)
            )
    }
}

struct SectionHeader: View {
    let title: String
    var subtitle: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title.uppercased())
                .font(.system(size: 11, weight: .heavy)).kerning(1.4)
                .foregroundStyle(Palette.text.opacity(0.85))
            if let subtitle {
                Text(subtitle).font(.system(size: 11)).foregroundStyle(Palette.dim)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}
