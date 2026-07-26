import SwiftUI

/// The horizontal loop track — the single most important object on screen.
struct LoopTrack: View {
    let progress: Double
    let glow: Double
    let color: Color
    var height: CGFloat = 28

    var body: some View {
        GeometryReader { geo in
            let filled = max(height * 0.5, geo.size.width * CGFloat(progress))
            ZStack(alignment: .leading) {
                Capsule().fill(Color.black.opacity(0.5))

                // Faint tick marks so a filling bar reads as discrete charge.
                HStack(spacing: 0) {
                    ForEach(0..<8, id: \.self) { _ in
                        Rectangle().fill(Color.white.opacity(0.05)).frame(width: 1)
                        Spacer(minLength: 0)
                    }
                }
                .padding(.horizontal, 6)

                Capsule()
                    .fill(LinearGradient(colors: [color.opacity(0.45), color],
                                         startPoint: .leading, endPoint: .trailing))
                    .frame(width: filled)
                    .shadow(color: color.opacity(0.65), radius: 9, y: 0)

                // Bright leading edge.
                Capsule()
                    .fill(Color.white.opacity(0.85))
                    .frame(width: 2, height: height - 10)
                    .offset(x: filled - 3)
                    .opacity(progress > 0.02 ? 0.7 : 0)

                // Completion flash across the whole track.
                Capsule()
                    .fill(color)
                    .opacity(0.85 * glow)
                    .blendMode(.plusLighter)
            }
        }
        .frame(height: height)
        .clipShape(Capsule())
        .overlay(Capsule().strokeBorder(Palette.stroke, lineWidth: 1))
    }
}

/// Vertical link between two loops. Lights up and drops a bead when a pulse fires.
struct PulseConnector: View {
    let glow: Double
    let color: Color
    var active: Bool

    var body: some View {
        ZStack {
            Rectangle()
                .fill(active ? color.opacity(0.18 + 0.6 * glow) : Color.white.opacity(0.06))
                .frame(width: 2)
            if active {
                Circle()
                    .fill(color)
                    .frame(width: 6, height: 6)
                    .shadow(color: color, radius: 5)
                    .offset(y: -9 + 18 * (1 - glow))
                    .opacity(glow)
            }
        }
        .frame(height: 18)
    }
}

/// Repeatable upgrade button: name, current effect, price. Dims when unaffordable.
struct UpgradeButton: View {
    let title: String
    let level: Int
    let effect: String
    let cost: Double
    let currency: Color
    let affordable: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 4) {
                    Text(title.uppercased())
                        .font(.system(size: 9, weight: .heavy)).kerning(0.6)
                        .foregroundStyle(Palette.dim)
                    Spacer(minLength: 0)
                    Text("\(level)")
                        .font(.mono(10, .bold))
                        .foregroundStyle(Palette.text.opacity(0.65))
                }
                Text(effect)
                    .font(.mono(12, .semibold))
                    .foregroundStyle(Palette.text)
                HStack(spacing: 3) {
                    Image(systemName: "bolt.fill").font(.system(size: 8))
                    Text(fmt(cost)).font(.mono(11, .bold))
                }
                .foregroundStyle(affordable ? currency : Palette.dim.opacity(0.7))
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, 9).padding(.vertical, 8)
            .background(
                RoundedRectangle(cornerRadius: 11, style: .continuous)
                    .fill(affordable ? Palette.panelHi : Palette.panelHi.opacity(0.4))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 11, style: .continuous)
                    .strokeBorder(affordable ? currency.opacity(0.35) : Palette.stroke, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
        .disabled(!affordable)
    }
}

struct CurrencyPill: View {
    let symbol: String
    let amount: Double
    let rate: Double?
    let color: Color

    var body: some View {
        HStack(spacing: 5) {
            Image(systemName: symbol).font(.system(size: 10, weight: .bold))
            Text(fmt(amount)).font(.mono(14, .bold))
            if let rate, rate > 0 {
                Text("+\(fmt(rate))/s")
                    .font(.mono(9, .semibold))
                    .foregroundStyle(color.opacity(0.7))
            }
        }
        .foregroundStyle(color)
        .padding(.horizontal, 10).padding(.vertical, 6)
        .background(
            Capsule().fill(color.opacity(0.10))
                .overlay(Capsule().strokeBorder(color.opacity(0.28), lineWidth: 1))
        )
    }
}

struct SectionHeader: View {
    let title: String
    var subtitle: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title.uppercased())
                .font(.system(size: 11, weight: .heavy)).kerning(1.4)
                .foregroundStyle(Palette.text.opacity(0.85))
            if let subtitle {
                Text(subtitle).font(.system(size: 11)).foregroundStyle(Palette.dim)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct PrimaryButton: View {
    let title: String
    var subtitle: String?
    let tint: Color
    var enabled: Bool = true
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 2) {
                Text(title).font(.system(size: 14, weight: .bold))
                if let subtitle {
                    Text(subtitle).font(.mono(11, .semibold)).opacity(0.75)
                }
            }
            .foregroundStyle(enabled ? Color.black.opacity(0.88) : Palette.dim)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .background(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(enabled
                          ? AnyShapeStyle(LinearGradient(colors: [tint, tint.opacity(0.7)],
                                                         startPoint: .top, endPoint: .bottom))
                          : AnyShapeStyle(Palette.panelHi))
            )
            .shadow(color: enabled ? tint.opacity(0.35) : .clear, radius: 10, y: 4)
        }
        .buttonStyle(.plain)
        .disabled(!enabled)
    }
}
