import SwiftUI

enum Tab: String, CaseIterable, Identifiable {
    case loops, modules, array, stats
    var id: String { rawValue }

    var title: String {
        switch self {
        case .loops: return "Cascade"
        case .modules: return "Modules"
        case .array: return "Array"
        case .stats: return "Stats"
        }
    }

    var symbol: String {
        switch self {
        case .loops: return "chart.bar.doc.horizontal"
        case .modules: return "square.grid.2x2.fill"
        case .array: return "circle.hexagongrid.fill"
        case .stats: return "list.bullet.rectangle"
        }
    }
}

struct RootView: View {
    @Environment(GameEngine.self) private var engine
    @State private var tab: Tab = .loops

    var body: some View {
        ZStack {
            Backdrop()
            VStack(spacing: 0) {
                topBar
                Group {
                    switch tab {
                    case .loops:   LoopsView()
                    case .modules: ModulesView()
                    case .array:   ArrayView()
                    case .stats:   StatsView()
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                tabBar
            }
        }
        .preferredColorScheme(.dark)
        .sheet(item: Binding(get: { engine.offlineReport },
                             set: { if $0 == nil { engine.offlineReport = nil } })) { report in
            OfflineSheet(report: report)
        }
    }

    private var topBar: some View {
        VStack(spacing: 8) {
            HStack {
                Text("CASCADE")
                    .font(.system(size: 15, weight: .black, design: .rounded)).kerning(3)
                    .foregroundStyle(
                        LinearGradient(colors: [Palette.tier(0), Palette.tier(5)],
                                       startPoint: .leading, endPoint: .trailing)
                    )
                Spacer()
                if engine.state.collapses > 0 {
                    Text("RUN \(engine.state.collapses + 1)")
                        .font(.system(size: 9, weight: .heavy)).kerning(1.2)
                        .foregroundStyle(Palette.echo)
                        .padding(.horizontal, 8).padding(.vertical, 4)
                        .background(Capsule().fill(Palette.echo.opacity(0.14)))
                }
            }

            HStack(spacing: 7) {
                CurrencyPill(symbol: "bolt.fill",
                             amount: engine.state.energy,
                             rate: engine.cachedRates.energyPerSecond,
                             color: Palette.energy)
                if engine.state.resonance > 0 || engine.state.deepestTier >= 3 {
                    CurrencyPill(symbol: "waveform",
                                 amount: engine.state.resonance,
                                 rate: engine.cachedRates.resonancePerSecond,
                                 color: Palette.resonance)
                }
                if engine.state.lifetimeEchoes > 0 {
                    CurrencyPill(symbol: "circle.hexagongrid.fill",
                                 amount: engine.state.echoes,
                                 rate: nil,
                                 color: Palette.echo)
                }
                Spacer(minLength: 0)
            }
        }
        .padding(.horizontal, 16)
        .padding(.bottom, 10)
    }

    private var tabBar: some View {
        HStack(spacing: 0) {
            ForEach(Tab.allCases) { t in
                Button { tab = t } label: {
                    VStack(spacing: 3) {
                        Image(systemName: t.symbol).font(.system(size: 15, weight: .semibold))
                        Text(t.title).font(.system(size: 9, weight: .bold))
                    }
                    .foregroundStyle(tab == t ? Palette.text : Palette.dim.opacity(0.7))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 9)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .overlay(alignment: .top) {
                    if tab == t {
                        Rectangle().fill(Palette.tier(2)).frame(height: 2)
                            .shadow(color: Palette.tier(2), radius: 5)
                    }
                }
            }
        }
        .padding(.top, 2)
        .background(.ultraThinMaterial)
        .overlay(alignment: .top) { Rectangle().fill(Palette.stroke).frame(height: 1) }
    }
}

private struct OfflineSheet: View {
    let report: OfflineReport
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            Backdrop()
            VStack(spacing: 16) {
                Text("THE MACHINE KEPT RUNNING")
                    .font(.system(size: 12, weight: .heavy)).kerning(1.6)
                    .foregroundStyle(Palette.tier(2))
                Text(fmtTime(report.elapsed))
                    .font(.system(size: 34, weight: .black, design: .rounded))
                    .foregroundStyle(Palette.text)
                Text("at \(Int(report.efficiency * 100))% efficiency")
                    .font(.system(size: 11)).foregroundStyle(Palette.dim)

                VStack(spacing: 0) {
                    line("Energy", fmt(report.energy), Palette.energy)
                    if report.resonance > 0 { line("Resonance", fmt(report.resonance), Palette.resonance) }
                    line("Cycles", fmt(report.completions), Palette.text)
                }
                .padding(.vertical, 4)
                .background(RoundedRectangle(cornerRadius: 16).fill(Palette.panel))
                .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(Palette.stroke, lineWidth: 1))

                PrimaryButton(title: "Collect", tint: Palette.tier(2)) { dismiss() }
            }
            .padding(24)
        }
        .presentationDetents([.medium])
        .presentationBackground(Palette.void)
    }

    private func line(_ label: String, _ value: String, _ color: Color) -> some View {
        HStack {
            Text(label).font(.system(size: 12)).foregroundStyle(Palette.dim)
            Spacer()
            Text("+\(value)").font(.mono(14, .bold)).foregroundStyle(color)
        }
        .padding(.horizontal, 16).padding(.vertical, 10)
    }
}
