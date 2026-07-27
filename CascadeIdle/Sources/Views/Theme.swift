import SwiftUI

enum Palette {
    static let void      = Color(red: 0.020, green: 0.024, blue: 0.055)
    static let panel     = Color(red: 0.055, green: 0.067, blue: 0.125)
    static let panelHi   = Color(red: 0.086, green: 0.104, blue: 0.184)
    static let stroke    = Color.white.opacity(0.075)
    static let text      = Color(red: 0.90, green: 0.93, blue: 1.00)
    static let dim       = Color(red: 0.52, green: 0.57, blue: 0.72)
    static let energy    = Color(hue: 0.115, saturation: 0.88, brightness: 1.00)
    static let resonance = Color(hue: 0.500, saturation: 0.72, brightness: 1.00)
    static let echo      = Color(hue: 0.800, saturation: 0.62, brightness: 1.00)

    /// Cyan at the Spark, sweeping through violet to hot pink at the Singularity.
    static func tier(_ i: Int) -> Color {
        let hue = (0.52 + Double(i) * 0.062).truncatingRemainder(dividingBy: 1.0)
        return Color(hue: hue, saturation: 0.72, brightness: 1.0)
    }
}

extension Font {
    static func mono(_ size: CGFloat, _ weight: Font.Weight = .semibold) -> Font {
        .system(size: size, weight: weight, design: .rounded).monospacedDigit()
    }
}

/// Deep-space backdrop: two accent glows and a slow, cheap starfield.
struct Backdrop: View {
    var body: some View {
        ZStack {
            Palette.void
            RadialGradient(colors: [Palette.tier(0).opacity(0.22), .clear],
                           center: UnitPoint(x: 0.12, y: 0.02), startRadius: 0, endRadius: 460)
            RadialGradient(colors: [Palette.tier(6).opacity(0.18), .clear],
                           center: UnitPoint(x: 0.96, y: 0.92), startRadius: 0, endRadius: 560)
            StarField()
        }
        .ignoresSafeArea()
    }
}

/// Scalar sine behind a real function call. Some Xcode toolchains will
/// auto-vectorize a bare `sin()` inside a loop into a batched libm symbol
/// (surfaces at link time as "undefined symbol: __msin") that isn't always
/// present to link against. `@inline(never)` keeps this call scalar.
@inline(never)
private func twinklePhase(_ x: Double) -> Double {
    0.25 + 0.35 * (0.5 + 0.5 * sin(x))
}

private struct StarField: View {
    private let stars: [(CGPoint, CGFloat, Double)] = {
        var seed: UInt64 = 0x5EED_CA5C
        func rnd() -> Double {
            seed = seed &* 6364136223846793005 &+ 1442695040888963407
            return Double((seed >> 33) % 100_000) / 100_000
        }
        return (0..<80).map { _ in
            (CGPoint(x: rnd(), y: rnd()), CGFloat(0.5 + rnd() * 1.4), rnd() * 6.28)
        }
    }()

    var body: some View {
        TimelineView(.periodic(from: .now, by: 1.0 / 12.0)) { timeline in
            Canvas { ctx, size in
                let t = timeline.date.timeIntervalSinceReferenceDate
                for (p, r, phase) in stars {
                    let twinkle = twinklePhase(t * 0.7 + phase)
                    let rect = CGRect(x: p.x * size.width - r, y: p.y * size.height - r,
                                      width: r * 2, height: r * 2)
                    ctx.fill(Path(ellipseIn: rect), with: .color(.white.opacity(twinkle)))
                }
            }
        }
        .allowsHitTesting(false)
    }
}

/// Standard card chrome used by every panel in the app.
struct Panel<Content: View>: View {
    var tint: Color = .white
    @ViewBuilder var content: Content

    var body: some View {
        content
            .background(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .fill(Palette.panel.opacity(0.92))
                    .overlay(
                        RoundedRectangle(cornerRadius: 18, style: .continuous)
                            .fill(
                                LinearGradient(colors: [tint.opacity(0.10), .clear],
                                               startPoint: .topLeading, endPoint: .bottomTrailing)
                            )
                    )
            )
            .overlay(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .strokeBorder(Palette.stroke, lineWidth: 1)
            )
    }
}
