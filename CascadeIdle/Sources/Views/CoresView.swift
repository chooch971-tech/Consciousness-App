import SwiftUI

/// Eight permanent perks, bought once each. No tree, no prerequisites —
/// the whole prestige layer fits on one screen.
struct CoresView: View {
    @Environment(GameEngine.self) private var engine

    var body: some View {
        ScrollView {
            VStack(spacing: 14) {
                Panel(tint: Palette.core) {
                    VStack(spacing: 9) {
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text("CORES")
                                    .font(.system(size: 11, weight: .heavy)).kerning(1.6)
                                    .foregroundStyle(Palette.core)
                                Text("Run \(engine.state.promotions + 1)")
                                    .font(.system(size: 11)).foregroundStyle(Palette.dim)
                            }
                            Spacer()
                            Text(fmt(engine.state.cores))
                                .font(.mono(24, .heavy))
                                .foregroundStyle(Palette.core)
                        }
                        HStack(spacing: 0) {
                            metric("×\(fmt(1 + Balance.corePermanentBonus * engine.state.lifetimeCores))",
                                   "lap speed")
                            metric(fmt(engine.state.lifetimeCores), "earned all time")
                            metric("\(engine.state.promotions)", "promotions")
                        }
                    }
                    .padding(14)
                }

                SectionHeader(title: "Perks",
                              subtitle: "Bought once, kept forever. Every Core ever earned also adds +5% lap speed.")

                ForEach(Perk.allCases) { perk in
                    PerkRow(perk: perk)
                }
            }
            .padding(.horizontal, 14)
            .padding(.bottom, 24)
        }
    }

    private func metric(_ v: String, _ l: String) -> some View {
        VStack(spacing: 1) {
            Text(v).font(.mono(13, .bold)).foregroundStyle(Palette.text)
            Text(l).font(.system(size: 8, weight: .semibold)).foregroundStyle(Palette.dim)
        }
        .frame(maxWidth: .infinity)
    }
}

private struct PerkRow: View {
    let perk: Perk
    @Environment(GameEngine.self) private var engine

    var body: some View {
        let owned = engine.owns(perk)
        let can = engine.canAfford(perk)

        Button { engine.buy(perk) } label: {
            HStack(spacing: 11) {
                Image(systemName: owned ? "checkmark.circle.fill" : perk.symbol)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(owned ? Palette.core : (can ? Palette.text : Palette.dim))
                    .frame(width: 32, height: 32)
                    .background(
                        RoundedRectangle(cornerRadius: 9)
                            .fill((owned ? Palette.core : Palette.dim).opacity(0.13))
                    )
                VStack(alignment: .leading, spacing: 1) {
                    Text(perk.name)
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(owned || can ? Palette.text : Palette.dim)
                    Text(perk.detail)
                        .font(.system(size: 10.5))
                        .foregroundStyle(Palette.dim)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Spacer(minLength: 0)
                if !owned {
                    Text(fmt(perk.cost))
                        .font(.mono(13, .bold))
                        .foregroundStyle(can ? Palette.core : Palette.dim.opacity(0.7))
                }
            }
            .padding(11)
            .background(
                RoundedRectangle(cornerRadius: 13)
                    .fill(owned ? Palette.core.opacity(0.10) : Palette.panel.opacity(0.85))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 13)
                    .strokeBorder(can ? Palette.core.opacity(0.5)
                                  : (owned ? Palette.core.opacity(0.25) : Palette.stroke),
                                  lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
        .disabled(!can)
    }
}
