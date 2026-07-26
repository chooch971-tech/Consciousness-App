import SwiftUI

struct ModulesView: View {
    @Environment(GameEngine.self) private var engine
    @State private var selected = 0
    @State private var picking: Int?

    private var unlockedTiers: [Int] {
        (0..<LoopConfig.count).filter { engine.state.loops[$0].unlocked }
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 14) {
                SectionHeader(title: "Modules",
                              subtitle: "Bought with Resonance and bolted to one loop. Slots are scarce — the build is the choice.")

                tierPicker

                Panel(tint: Palette.tier(selected)) {
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Text(LoopConfig.all[selected].name)
                                .font(.system(size: 17, weight: .bold, design: .rounded))
                                .foregroundStyle(Palette.text)
                            Spacer()
                            Text("\(engine.state.loops[selected].modules.count) / \(engine.slots(for: selected)) slots")
                                .font(.mono(11, .bold)).foregroundStyle(Palette.dim)
                        }
                        Text(LoopConfig.all[selected].flavor)
                            .font(.system(size: 11)).foregroundStyle(Palette.dim)
                            .fixedSize(horizontal: false, vertical: true)

                        ForEach(0..<engine.slots(for: selected), id: \.self) { slot in
                            slotRow(slot)
                        }
                    }
                    .padding(14)
                }

                catalog
            }
            .padding(.horizontal, 14)
            .padding(.bottom, 28)
        }
        .sheet(item: Binding(get: { picking.map { SlotTarget(loop: selected, slot: $0) } },
                             set: { if $0 == nil { picking = nil } })) { target in
            ModulePicker(loop: target.loop)
        }
    }

    private var tierPicker: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 7) {
                ForEach(unlockedTiers, id: \.self) { i in
                    Button { selected = i } label: {
                        VStack(spacing: 2) {
                            Text(romanNumerals[i])
                                .font(.system(size: 11, weight: .black, design: .serif))
                            Text(LoopConfig.all[i].name)
                                .font(.system(size: 9, weight: .semibold))
                        }
                        .foregroundStyle(selected == i ? .black.opacity(0.85) : Palette.tier(i))
                        .padding(.horizontal, 12).padding(.vertical, 7)
                        .background(
                            Capsule().fill(selected == i ? Palette.tier(i) : Palette.tier(i).opacity(0.12))
                        )
                        .overlay(Capsule().strokeBorder(Palette.tier(i).opacity(0.35), lineWidth: 1))
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.vertical, 2)
        }
    }

    @ViewBuilder
    private func slotRow(_ slot: Int) -> some View {
        let installed = engine.state.loops[selected].modules
        if slot < installed.count {
            let m = installed[slot]
            HStack(spacing: 10) {
                Image(systemName: m.symbol)
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(Palette.resonance)
                    .frame(width: 30, height: 30)
                    .background(RoundedRectangle(cornerRadius: 9).fill(Palette.resonance.opacity(0.14)))
                VStack(alignment: .leading, spacing: 1) {
                    Text(m.name).font(.system(size: 13, weight: .bold)).foregroundStyle(Palette.text)
                    Text(m.detail).font(.system(size: 10)).foregroundStyle(Palette.dim)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Spacer(minLength: 0)
                Button {
                    engine.uninstall(m, from: selected)
                } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(Palette.dim)
                        .padding(7)
                        .background(Circle().fill(Palette.panelHi))
                }
                .buttonStyle(.plain)
            }
            .padding(9)
            .background(RoundedRectangle(cornerRadius: 12).fill(Palette.panelHi.opacity(0.7)))
        } else {
            Button { picking = slot } label: {
                HStack(spacing: 9) {
                    Image(systemName: "plus")
                        .font(.system(size: 12, weight: .bold))
                    Text("Empty slot").font(.system(size: 12, weight: .semibold))
                    Spacer(minLength: 0)
                }
                .foregroundStyle(Palette.dim)
                .padding(12)
                .frame(maxWidth: .infinity)
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .strokeBorder(style: StrokeStyle(lineWidth: 1, dash: [4, 4]))
                        .foregroundStyle(Palette.stroke)
                )
            }
            .buttonStyle(.plain)
        }
    }

    private var catalog: some View {
        VStack(alignment: .leading, spacing: 8) {
            SectionHeader(title: "Catalogue",
                          subtitle: "Each copy you own raises the price of the next by 2.6×.")
            ForEach(ModuleID.allCases) { m in
                HStack(spacing: 10) {
                    Image(systemName: m.symbol)
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(Palette.resonance)
                        .frame(width: 26)
                    VStack(alignment: .leading, spacing: 1) {
                        Text(m.name).font(.system(size: 12, weight: .bold)).foregroundStyle(Palette.text)
                        Text(m.detail).font(.system(size: 10)).foregroundStyle(Palette.dim)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    Spacer(minLength: 0)
                    VStack(alignment: .trailing, spacing: 1) {
                        Text(fmt(engine.moduleCost(m)))
                            .font(.mono(11, .bold)).foregroundStyle(Palette.resonance)
                        Text("owned \(engine.state.modulesOwned[m.rawValue] ?? 0)")
                            .font(.system(size: 9)).foregroundStyle(Palette.dim)
                    }
                }
                .padding(10)
                .background(RoundedRectangle(cornerRadius: 12).fill(Palette.panel.opacity(0.8)))
                .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(Palette.stroke, lineWidth: 1))
            }
        }
    }
}

private struct SlotTarget: Identifiable {
    let loop: Int
    let slot: Int
    var id: String { "\(loop)-\(slot)" }
}

private struct ModulePicker: View {
    let loop: Int
    @Environment(GameEngine.self) private var engine
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            Backdrop()
            ScrollView {
                VStack(spacing: 10) {
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Install on \(LoopConfig.all[loop].name)")
                                .font(.system(size: 16, weight: .bold, design: .rounded))
                                .foregroundStyle(Palette.text)
                            Text("\(fmt(engine.state.resonance)) Resonance available")
                                .font(.mono(11, .semibold)).foregroundStyle(Palette.resonance)
                        }
                        Spacer()
                        Button("Done") { dismiss() }
                            .font(.system(size: 13, weight: .bold))
                            .foregroundStyle(Palette.dim)
                    }
                    .padding(.top, 6)

                    ForEach(ModuleID.allCases) { m in
                        let owned = engine.state.loops[loop].modules.contains(m)
                        let can = engine.canInstall(m, on: loop)
                        Button {
                            if engine.install(m, on: loop) { dismiss() }
                        } label: {
                            HStack(spacing: 11) {
                                Image(systemName: m.symbol)
                                    .font(.system(size: 14, weight: .bold))
                                    .foregroundStyle(can ? Palette.resonance : Palette.dim)
                                    .frame(width: 32, height: 32)
                                    .background(RoundedRectangle(cornerRadius: 9)
                                        .fill((can ? Palette.resonance : Palette.dim).opacity(0.12)))
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(m.name).font(.system(size: 13, weight: .bold))
                                        .foregroundStyle(can ? Palette.text : Palette.dim)
                                    Text(owned ? "Already installed on this loop" : m.detail)
                                        .font(.system(size: 10)).foregroundStyle(Palette.dim)
                                        .fixedSize(horizontal: false, vertical: true)
                                }
                                Spacer(minLength: 0)
                                Text(fmt(engine.moduleCost(m)))
                                    .font(.mono(12, .bold))
                                    .foregroundStyle(can ? Palette.resonance : Palette.dim.opacity(0.7))
                            }
                            .padding(11)
                            .background(RoundedRectangle(cornerRadius: 14).fill(Palette.panel))
                            .overlay(RoundedRectangle(cornerRadius: 14)
                                .strokeBorder(can ? Palette.resonance.opacity(0.35) : Palette.stroke, lineWidth: 1))
                        }
                        .buttonStyle(.plain)
                        .disabled(!can)
                    }
                }
                .padding(.horizontal, 14)
                .padding(.bottom, 24)
            }
        }
        .presentationDetents([.large])
        .presentationBackground(Palette.void)
    }
}
