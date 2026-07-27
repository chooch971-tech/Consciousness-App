import SwiftUI

/// The centerpiece: one ring per generator, red at the core out to magenta.
/// A ring's bright arc is its current lap — the loops from the original
/// concept, drawn as actual loops.
struct RingsView: View {
    @Environment(GameEngine.self) private var engine

    var body: some View {
        GeometryReader { geo in
            let d = min(geo.size.width, geo.size.height)
            ZStack {
                ForEach(0..<Gen.count, id: \.self) { i in
                    ring(i, in: d)
                }
                core(in: d)
            }
            .frame(width: geo.size.width, height: geo.size.height)
        }
        .aspectRatio(1, contentMode: .fit)
    }

    private func ring(_ i: Int, in d: CGFloat) -> some View {
        let step = d * 0.045
        let radius = d * 0.10 + CGFloat(i) * step
        let width = step * 0.62
        let live = engine.state.owned[i] > 0
        let color = Gen.color(i)

        return ZStack {
            Circle()
                .stroke(live ? color.opacity(0.20) : Color.white.opacity(0.05),
                        lineWidth: width)
            if live {
                Circle()
                    .trim(from: 0, to: max(0.02, engine.phase[i]))
                    .stroke(color, style: StrokeStyle(lineWidth: width, lineCap: .round))
                    .shadow(color: color.opacity(0.9), radius: width * 0.6)
            }
        }
        .frame(width: radius * 2, height: radius * 2)
        .rotationEffect(.degrees(-90))
    }

    private func core(in d: CGFloat) -> some View {
        let pulse = engine.phase.first ?? 0
        return Circle()
            .fill(Gen.color(0))
            .frame(width: d * 0.075, height: d * 0.075)
            .shadow(color: Gen.color(0).opacity(0.9), radius: 10 + 6 * pulse)
    }
}

/// The chained laps-per-second readout across the top, mirroring Revolution
/// Idle's multiplier strip. Only live generators appear.
struct LapStrip: View {
    @Environment(GameEngine.self) private var engine

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                ForEach(0..<Gen.count, id: \.self) { i in
                    if engine.state.owned[i] > 0 {
                        if i > 0 {
                            Text("×").font(.system(size: 9, weight: .bold))
                                .foregroundStyle(Palette.dim)
                        }
                        Text(fmt(engine.lapsPerSecond(i)))
                            .font(.mono(11, .bold))
                            .foregroundStyle(Gen.color(i))
                    }
                }
            }
            .padding(.horizontal, 16)
        }
        .frame(height: 18)
    }
}
