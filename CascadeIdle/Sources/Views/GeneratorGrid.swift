import SwiftUI

enum BuyMode: String, CaseIterable {
    case one = "×1"
    case max = "MAX"
}

/// Three-column grid of buy tiles — the entire moment-to-moment interaction.
/// Tap a tile, own one more of that generator.
struct GeneratorGrid: View {
    @Binding var mode: BuyMode
    @Environment(GameEngine.self) private var engine

    private let columns = [GridItem(.flexible(), spacing: 8),
                           GridItem(.flexible(), spacing: 8),
                           GridItem(.flexible(), spacing: 8)]

    /// Everything owned, plus the next one along so there's always a target.
    private var visible: [Int] {
        let deepest = engine.state.deepestUnlocked
        return Array(0...min(deepest, Gen.count - 1))
    }

    var body: some View {
        LazyVGrid(columns: columns, spacing: 8) {
            ForEach(visible, id: \.self) { i in
                GenTile(index: i, mode: mode)
            }
        }
    }
}

private struct GenTile: View {
    let index: Int
    let mode: BuyMode
    @Environment(GameEngine.self) private var engine

    private var affordable: Bool { engine.canBuy(index) }
    private var color: Color { Gen.color(index) }

    private var priceLabel: String {
        if mode == .max, engine.affordableCount(index) > 1 {
            let n = engine.affordableCount(index)
            return "\(fmt(engine.totalCost(index, count: n))) ·×\(n)"
        }
        return fmt(engine.cost(index))
    }

    var body: some View {
        Button {
            if mode == .max { engine.buyMax(index) } else { engine.buy(index) }
        } label: {
            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 3) {
                    Text(roman(index + 1))
                        .font(.system(size: 9, weight: .black, design: .serif))
                    Spacer(minLength: 0)
                    Text("×\(fmt(engine.state.owned[index]))")
                        .font(.mono(9, .bold))
                        .opacity(0.75)
                }
                .foregroundStyle(color)

                Text("\(fmt(engine.lapsPerSecond(index)))/s")
                    .font(.mono(12, .bold))
                    .foregroundStyle(Palette.text)
                    .lineLimit(1).minimumScaleFactor(0.6)

                Text("[+\(fmt(engine.lapGain(index)))]")
                    .font(.mono(8.5, .semibold))
                    .foregroundStyle(color.opacity(0.85))

                Text(priceLabel)
                    .font(.mono(10, .bold))
                    .foregroundStyle(affordable ? Palette.energy : Palette.dim.opacity(0.8))
                    .lineLimit(1).minimumScaleFactor(0.5)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 8).padding(.vertical, 7)
            .background(
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .fill(Gen.tileColor(index).opacity(affordable ? 0.85 : 0.35))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .strokeBorder(affordable ? color.opacity(0.7) : Color.white.opacity(0.08),
                                  lineWidth: 1)
            )
        }
        .buttonStyle(TilePress())
        .disabled(!affordable)
    }
}

/// A tile should feel like a physical button under the thumb.
private struct TilePress: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.94 : 1)
            .animation(.spring(response: 0.2, dampingFraction: 0.6), value: configuration.isPressed)
    }
}
