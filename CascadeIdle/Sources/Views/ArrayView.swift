import SwiftUI

struct ArrayView: View {
    @Environment(GameEngine.self) private var engine
    @State private var confirming = false

    private let columnTitles = ["Throughput", "Head Start", "Capacity", "Automation"]

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                collapsePanel

                SectionHeader(title: "The Array",
                              subtitle: "Echoes buy permanent nodes. Nothing here is ever lost.")

                ForEach(0..<columnTitles.count, id: \.self) { col in
                    VStack(alignment: .leading, spacing: 7) {
                        Text(columnTitles[col].uppercased())
                            .font(.system(size: 10, weight: .heavy)).kerning(1.2)
                            .foregroundStyle(Palette.echo.opacity(0.8))
                        ForEach(ArrayNode.all.filter { $0.column == col }) { node in
                            NodeRow(node: node)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
            .padding(.horizontal, 14)
            .padding(.bottom, 28)
        }
        .alert("Collapse the cascade?", isPresented: $confirming) {
            Button("Collapse", role: .destructive) { engine.collapse() }
            Button("Not yet", role: .cancel) {}
        } message: {
            Text("Loops, upgrades and Energy reset. You keep the Array, your Echoes, and every permanent bonus they carry.")
        }
    }

    private var collapsePanel: some View {
        Panel(tint: Palette.echo) {
            VStack(spacing: 11) {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("COLLAPSE")
                            .font(.system(size: 11, weight: .heavy)).kerning(1.6)
                            .foregroundStyle(Palette.echo)
                        Text("Run \(engine.state.collapses + 1)")
                            .font(.system(size: 11)).foregroundStyle(Palette.dim)
                    }
                    Spacer()
                    VStack(alignment: .trailing, spacing: 2) {
                        Text(fmt(engine.state.echoes))
                            .font(.mono(20, .heavy)).foregroundStyle(Palette.echo)
                        Text("Echoes banked").font(.system(size: 9)).foregroundStyle(Palette.dim)
                    }
                }

                HStack(spacing: 0) {
                    metric(fmt(engine.pendingEchoes), "on collapse")
                    metric(fmt(engine.state.energyThisRun), "energy this run")
                    metric("×\(fmt(engine.echoMultiplier))", "permanent yield")
                }

                if engine.canCollapse {
                    PrimaryButton(title: "Collapse for \(fmt(engine.pendingEchoes)) Echoes",
                                  subtitle: "next Echo at \(fmt(engine.energyForNextEcho)) Energy",
                                  tint: Palette.echo) { confirming = true }
                } else {
                    VStack(spacing: 5) {
                        Text(engine.state.deepestTier < Balance.collapseUnlockTier
                             ? "Bring \(LoopConfig.all[Balance.collapseUnlockTier].name) online to unlock Collapse."
                             : "Reach \(fmt(engine.energyForNextEcho)) Energy this run for your first Echo.")
                            .font(.system(size: 11))
                            .foregroundStyle(Palette.dim)
                            .multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                }
            }
            .padding(14)
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

private struct NodeRow: View {
    let node: ArrayNode
    @Environment(GameEngine.self) private var engine

    var body: some View {
        let owned = engine.nodeOwned(node.id)
        let available = engine.nodeUnlocked(node)
        let can = engine.canBuyNode(node)

        Button { engine.buyNode(node) } label: {
            HStack(spacing: 10) {
                Image(systemName: owned ? "checkmark.circle.fill" : (available ? "circle" : "lock.fill"))
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(owned ? Palette.echo : Palette.dim)
                VStack(alignment: .leading, spacing: 1) {
                    Text(node.name)
                        .font(.system(size: 12.5, weight: .bold))
                        .foregroundStyle(owned || available ? Palette.text : Palette.dim)
                    Text(node.detail)
                        .font(.system(size: 10)).foregroundStyle(Palette.dim)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Spacer(minLength: 0)
                if !owned {
                    Text(fmt(node.cost))
                        .font(.mono(12, .bold))
                        .foregroundStyle(can ? Palette.echo : Palette.dim.opacity(0.7))
                }
            }
            .padding(10)
            .background(RoundedRectangle(cornerRadius: 12)
                .fill(owned ? Palette.echo.opacity(0.10) : Palette.panel.opacity(0.85)))
            .overlay(RoundedRectangle(cornerRadius: 12)
                .strokeBorder(can ? Palette.echo.opacity(0.45)
                              : (owned ? Palette.echo.opacity(0.25) : Palette.stroke), lineWidth: 1))
        }
        .buttonStyle(.plain)
        .disabled(!can)
        .opacity(available || owned ? 1 : 0.55)
    }
}
