import SwiftUI

enum Tab: String, CaseIterable, Identifiable {
    case main, cores, stats
    var id: String { rawValue }

    var title: String {
        switch self {
        case .main: return "Engine"
        case .cores: return "Cores"
        case .stats: return "Stats"
        }
    }

    var symbol: String {
        switch self {
        case .main: return "circle.circle.fill"
        case .cores: return "hexagon.fill"
        case .stats: return "list.bullet.rectangle"
        }
    }
}

struct RootView: View {
    @Environment(GameEngine.self) private var engine
    @State private var tab: Tab = .main

    var body: some View {
        ZStack {
            Backdrop()
            VStack(spacing: 0) {
                Group {
                    switch tab {
                    case .main:  MainView()
                    case .cores: CoresView()
                    case .stats: StatsView()
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

    private var tabBar: some View {
        HStack(spacing: 0) {
            ForEach(Tab.allCases) { t in
                Button { tab = t } label: {
                    VStack(spacing: 3) {
                        Image(systemName: t.symbol).font(.system(size: 16, weight: .semibold))
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
                        Rectangle().fill(Gen.color(4)).frame(height: 2)
                            .shadow(color: Gen.color(4), radius: 5)
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
            VStack(spacing: 14) {
                Text("THE ENGINE KEPT TURNING")
                    .font(.system(size: 12, weight: .heavy)).kerning(1.6)
                    .foregroundStyle(Gen.color(3))
                Text(fmtTime(report.elapsed))
                    .font(.system(size: 34, weight: .black, design: .rounded))
                    .foregroundStyle(Palette.text)
                Text("at \(Int(report.efficiency * 100))% efficiency")
                    .font(.system(size: 11)).foregroundStyle(Palette.dim)

                HStack {
                    Text("Energy").font(.system(size: 12)).foregroundStyle(Palette.dim)
                    Spacer()
                    Text("+\(fmt(report.energy))")
                        .font(.mono(15, .bold)).foregroundStyle(Palette.energy)
                }
                .padding(.horizontal, 16).padding(.vertical, 12)
                .background(RoundedRectangle(cornerRadius: 14).fill(Palette.panel))
                .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(Palette.stroke, lineWidth: 1))

                Button { dismiss() } label: {
                    Text("Collect")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(.black.opacity(0.85))
                        .frame(maxWidth: .infinity).padding(.vertical, 12)
                        .background(RoundedRectangle(cornerRadius: 13).fill(Gen.color(3)))
                }
                .buttonStyle(.plain)
            }
            .padding(24)
        }
        .presentationDetents([.medium])
        .presentationBackground(Palette.void)
    }
}
