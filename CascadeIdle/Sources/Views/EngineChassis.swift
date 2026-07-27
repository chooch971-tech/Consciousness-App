import SwiftUI

/// The machine the whole game lives inside. A riveted housing with a
/// nameplate, a recessed well holding the generator lines, and an output
/// manifold at the bottom where Energy comes out.
///
/// The mark number rises with every Promotion, so the chassis itself is the
/// record of how far you've come.
struct EngineChassis<Content: View>: View {
    @Environment(GameEngine.self) private var engine
    @ViewBuilder var content: Content

    private var mark: String { roman(engine.state.promotions + 1) }

    private var status: String {
        if engine.state.perks.contains(.overdrive3) { return "OVERDRIVE" }
        if engine.state.perks.contains(.overdrive1) { return "BOOSTED" }
        if engine.energyPerSecond > 0 { return "NOMINAL" }
        return "IDLE"
    }

    var body: some View {
        VStack(spacing: 0) {
            namePlate
            etch
            well
            etch
            outputManifold
        }
        .background(
            LinearGradient(colors: [Color(white: 0.165), Color(white: 0.105)],
                           startPoint: .top, endPoint: .bottom)
        )
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .strokeBorder(Color.white.opacity(0.13), lineWidth: 1)
        )
        .overlay(rivets)
        .shadow(color: .black.opacity(0.5), radius: 12, y: 5)
    }

    // MARK: - Nameplate

    private var namePlate: some View {
        HStack(spacing: 8) {
            statusLamp
            VStack(alignment: .leading, spacing: 0) {
                Text("CASCADE ENGINE")
                    .font(.system(size: 11, weight: .heavy)).kerning(1.8)
                    .foregroundStyle(Palette.text.opacity(0.9))
                Text(status)
                    .font(.system(size: 8, weight: .bold)).kerning(1.2)
                    .foregroundStyle(Palette.dim)
            }
            Spacer(minLength: 0)
            Text("MK.\(mark)")
                .font(.system(size: 12, weight: .black, design: .serif))
                .foregroundStyle(Palette.text.opacity(0.55))
                .padding(.horizontal, 8).padding(.vertical, 3)
                .background(
                    RoundedRectangle(cornerRadius: 5)
                        .fill(Color.black.opacity(0.3))
                        .overlay(RoundedRectangle(cornerRadius: 5)
                            .strokeBorder(Color.white.opacity(0.08), lineWidth: 1))
                )
        }
        .padding(.horizontal, 16).padding(.vertical, 10)
    }

    /// Blinks with generator I, so the lamp is literally tied to the output.
    private var statusLamp: some View {
        let lit = engine.state.owned[0] > 0
        let glow = 0.45 + 0.55 * engine.fire(0)
        return Circle()
            .fill(lit ? Gen.color(0).opacity(glow) : Color.white.opacity(0.12))
            .frame(width: 9, height: 9)
            .overlay(Circle().strokeBorder(Color.black.opacity(0.45), lineWidth: 1))
            .shadow(color: lit ? Gen.color(0).opacity(glow) : .clear, radius: 5)
    }

    // MARK: - Well

    /// Recessed interior. The darker fill plus a top highlight reads as depth.
    private var well: some View {
        content
            .padding(.horizontal, 14)
            .padding(.vertical, 13)
            .frame(maxWidth: .infinity)
            .background(Color.black.opacity(0.32))
            .overlay(alignment: .top) {
                LinearGradient(colors: [.black.opacity(0.35), .clear],
                               startPoint: .top, endPoint: .bottom)
                    .frame(height: 10)
                    .allowsHitTesting(false)
            }
    }

    // MARK: - Output

    private var outputManifold: some View {
        HStack(alignment: .center, spacing: 12) {
            grille
            VStack(alignment: .trailing, spacing: 1) {
                Text(fmt(engine.state.energy))
                    .font(.system(size: 25, weight: .black, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(Palette.text)
                    .lineLimit(1).minimumScaleFactor(0.45)
                Text("+\(fmt(engine.energyPerSecond)) / sec")
                    .font(.mono(10.5, .bold))
                    .foregroundStyle(Palette.energy)
                    .lineLimit(1).minimumScaleFactor(0.6)
            }
        }
        .padding(.horizontal, 16).padding(.vertical, 11)
    }

    /// Vent slots, lit by generator I's output.
    private var grille: some View {
        let heat = engine.state.owned[0] > 0 ? 0.25 + 0.6 * engine.fire(0) : 0.06
        return HStack(spacing: 3) {
            ForEach(0..<7, id: \.self) { n in
                RoundedRectangle(cornerRadius: 1.5)
                    .fill(Palette.energy.opacity(heat * (n % 2 == 0 ? 1 : 0.55)))
                    .frame(width: 3, height: 16)
            }
        }
    }

    // MARK: - Chrome

    private var etch: some View {
        VStack(spacing: 0) {
            Rectangle().fill(Color.black.opacity(0.5)).frame(height: 1)
            Rectangle().fill(Color.white.opacity(0.06)).frame(height: 1)
        }
    }

    private var rivets: some View {
        GeometryReader { geo in
            ForEach(0..<4, id: \.self) { n in
                Circle()
                    .fill(
                        RadialGradient(colors: [Color(white: 0.34), Color(white: 0.13)],
                                       center: .topLeading, startRadius: 0, endRadius: 6)
                    )
                    .overlay(Circle().strokeBorder(Color.black.opacity(0.4), lineWidth: 0.5))
                    .frame(width: 5, height: 5)
                    .position(x: n % 2 == 0 ? 11 : geo.size.width - 11,
                              y: n < 2 ? 11 : geo.size.height - 11)
            }
        }
        .allowsHitTesting(false)
    }
}
