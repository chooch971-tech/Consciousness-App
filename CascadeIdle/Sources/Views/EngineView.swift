import SwiftUI

/// The centrepiece: one horizontal line per generator, stacked in sequence.
///
/// Generator I sits at the top because that's the one that pays out, and each
/// line below feeds the one above it — so a completed lap throws a bead up the
/// connector and the line above flashes as it takes the hit.
struct EngineView: View {
    @Environment(GameEngine.self) private var engine

    private var visible: [Int] {
        (0..<Gen.count).filter { engine.state.owned[$0] > 0 || engine.state.unlocked($0) }
    }

    var body: some View {
        VStack(spacing: 0) {
            ForEach(visible.indices, id: \.self) { slot in
                LineRow(index: visible[slot])
                if slot < visible.count - 1 {
                    let below = visible[slot + 1]
                    PulseLink(fire: engine.fire(below), color: Gen.color(below))
                }
            }
        }
    }
}

private struct LineRow: View {
    let index: Int
    @Environment(GameEngine.self) private var engine

    var body: some View {
        let live = engine.state.owned[index] > 0
        let color = Gen.color(index)
        let flash = engine.fire(index)

        HStack(spacing: 9) {
            Text(roman(index + 1))
                .font(.system(size: 10, weight: .black, design: .serif))
                .foregroundStyle(live ? color : Palette.dim.opacity(0.6))
                .frame(width: 24, alignment: .trailing)

            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule().fill(Color.white.opacity(0.055))

                    if live {
                        Capsule()
                            .fill(LinearGradient(colors: [color.opacity(0.55), color],
                                                 startPoint: .leading, endPoint: .trailing))
                            .frame(width: max(4, geo.size.width * CGFloat(engine.phase[index])))
                            .shadow(color: color.opacity(0.75), radius: 6)

                        // The whole line lights up at the instant it fires.
                        Capsule()
                            .fill(color)
                            .opacity(0.9 * flash)
                            .blendMode(.plusLighter)
                    }
                }
            }
            .frame(height: 13)
            .clipShape(Capsule())

            Text(live ? "\(fmt(engine.lapsPerSecond(index)))/s" : "—")
                .font(.mono(9.5, .bold))
                .foregroundStyle(live ? color.opacity(0.9) : Palette.dim.opacity(0.5))
                .frame(width: 62, alignment: .leading)
                .lineLimit(1).minimumScaleFactor(0.6)
        }
        .frame(height: 20)
    }
}

/// The link between two lines. A bead rides up it each time the lower line fires.
private struct PulseLink: View {
    let fire: Double
    let color: Color

    var body: some View {
        ZStack {
            Rectangle()
                .fill(color.opacity(0.12 + 0.5 * fire))
                .frame(width: 2, height: 14)
            Circle()
                .fill(color)
                .frame(width: 5, height: 5)
                .shadow(color: color, radius: 4)
                .offset(y: 7 - 14 * (1 - fire))
                .opacity(fire)
        }
        .frame(height: 14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.leading, 32)
    }
}

/// The chained laps-per-second readout across the top, mirroring Revolution
/// Idle's multiplier strip.
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
