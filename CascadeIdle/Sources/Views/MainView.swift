import SwiftUI

struct MainView: View {
    @Environment(GameEngine.self) private var engine
    @State private var mode: BuyMode = .max
    @State private var confirmingPromote = false

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                LapStrip()

                VStack(spacing: 2) {
                    Text(fmt(engine.state.energy))
                        .font(.system(size: 32, weight: .black, design: .rounded))
                        .monospacedDigit()
                        .foregroundStyle(Palette.text)
                        .lineLimit(1).minimumScaleFactor(0.5)
                    Text("+\(fmt(engine.energyPerSecond)) / sec")
                        .font(.mono(12, .semibold))
                        .foregroundStyle(Palette.energy)
                }

                EngineView()
                    .padding(.horizontal, 4)
                    .padding(.vertical, 6)

                promoteBar
                buyControls
                GeneratorGrid(mode: $mode)
            }
            .padding(.horizontal, 14)
            .padding(.bottom, 24)
        }
        .alert("Promote?", isPresented: $confirmingPromote) {
            Button("Promote", role: .destructive) { engine.promote() }
            Button("Not yet", role: .cancel) {}
        } message: {
            Text("Generators and Energy reset. You keep your Cores and everything they've bought.")
        }
    }

    @ViewBuilder
    private var promoteBar: some View {
        if engine.canPromote {
            Button { confirmingPromote = true } label: {
                HStack {
                    Text("PROMOTE")
                        .font(.system(size: 13, weight: .heavy)).kerning(1.4)
                    Spacer()
                    Text("+\(fmt(engine.pendingCores)) Cores")
                        .font(.mono(13, .bold))
                }
                .foregroundStyle(.black.opacity(0.85))
                .padding(.horizontal, 16).padding(.vertical, 12)
                .frame(maxWidth: .infinity)
                .background(
                    RoundedRectangle(cornerRadius: 13, style: .continuous)
                        .fill(LinearGradient(colors: [Palette.core, Palette.core.opacity(0.72)],
                                             startPoint: .top, endPoint: .bottom))
                )
                .shadow(color: Palette.core.opacity(0.35), radius: 10, y: 4)
            }
            .buttonStyle(.plain)
        } else {
            Text("Next Core at \(fmt(engine.energyForNextCore)) Energy this run")
                .font(.system(size: 11))
                .foregroundStyle(Palette.dim)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 6)
        }
    }

    private var buyControls: some View {
        HStack(spacing: 8) {
            ForEach(BuyMode.allCases, id: \.self) { m in
                Button { mode = m } label: {
                    Text(m.rawValue)
                        .font(.system(size: 12, weight: .heavy))
                        .foregroundStyle(mode == m ? .black.opacity(0.85) : Palette.dim)
                        .frame(width: 54, height: 34)
                        .background(
                            RoundedRectangle(cornerRadius: 10, style: .continuous)
                                .fill(mode == m ? Palette.text : Palette.panelHi)
                        )
                }
                .buttonStyle(.plain)
            }

            Button { engine.buyAll(max: mode == .max) } label: {
                Text("BUY ALL")
                    .font(.system(size: 12, weight: .heavy)).kerning(1)
                    .foregroundStyle(Palette.text)
                    .frame(maxWidth: .infinity, minHeight: 34)
                    .background(
                        RoundedRectangle(cornerRadius: 10, style: .continuous)
                            .fill(Palette.panelHi)
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 10, style: .continuous)
                            .strokeBorder(Palette.stroke, lineWidth: 1)
                    )
            }
            .buttonStyle(.plain)
        }
    }
}
