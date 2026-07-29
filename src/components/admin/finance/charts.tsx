'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { formatMoney } from '@/lib/format';

import {
  CHART_COLORS,
  CHART_INK,
  MAX_CATEGORY_SLICES,
  MONTHLY_SERIES,
  OTHER_CATEGORY_LABEL,
  formatAxisMoney,
  formatDayLabel,
  formatMonthLabel,
} from './chart-theme';

/**
 * Aylık satış / tahsilat / kâr çizgisi.
 *
 * NEDEN ÇİZGİ, ÇUBUK DEĞİL: soru "zaman içinde nasıl değişti" — çubuk
 * grafik ayları ayrı büyüklükler gibi gösterir, çizgi eğilimi gösterir.
 *
 * TEK EKSEN: üç seri de TL cinsinden; ikinci bir y ekseni açmak (ör. satış
 * adedi) iki ölçeği aynı görsel yüksekliğe bindirir ve kesişme noktalarına
 * olmayan bir anlam yükler.
 */
export function MonthlyTrendChart({
  data,
}: {
  data: { month: string; sales: string; payments: string; profit: string }[];
}) {
  const rows = data.map((point) => ({
    month: formatMonthLabel(point.month),
    sales: Number(point.sales),
    payments: Number(point.payments),
    profit: Number(point.profit),
  }));

  return (
    <div className="flex flex-col gap-3">
      <ChartLegend items={MONTHLY_SERIES.map((s) => ({ label: s.label, color: s.color }))} />

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
          <CartesianGrid stroke={CHART_INK.grid} vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12, fill: CHART_INK.label }}
            axisLine={{ stroke: CHART_INK.axis }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatAxisMoney}
            tick={{ fontSize: 12, fill: CHART_INK.label }}
            axisLine={false}
            tickLine={false}
            width={56}
          />
          <Tooltip content={<MoneyTooltip />} cursor={{ stroke: CHART_INK.axis }} />

          {MONTHLY_SERIES.map((series) => (
            <Line
              key={series.key}
              type="monotone"
              dataKey={series.key}
              name={series.label}
              stroke={series.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: '#ffffff' }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Gün bazlı tek seri — rapor ekranlarındaki tarih aralığı grafiği. */
export function DailyTrendChart({
  data,
  label,
  colorIndex = 0,
}: {
  data: { date: string; total: string }[];
  label: string;
  colorIndex?: number;
}) {
  const color = CHART_COLORS[colorIndex] ?? CHART_COLORS[0];
  const rows = data.map((point) => ({
    date: formatDayLabel(point.date),
    total: Number(point.total),
  }));

  if (rows.length === 0) {
    return <EmptyChart />;
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
        <CartesianGrid stroke={CHART_INK.grid} vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12, fill: CHART_INK.label }}
          axisLine={{ stroke: CHART_INK.axis }}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatAxisMoney}
          tick={{ fontSize: 12, fill: CHART_INK.label }}
          axisLine={false}
          tickLine={false}
          width={56}
        />
        <Tooltip content={<MoneyTooltip />} cursor={{ fill: CHART_INK.grid }} />
        {/* Veri ucu 4px yuvarlatılır, taban çizgisine oturur. */}
        <Bar dataKey="total" name={label} fill={color} radius={[4, 4, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * Kategori / ürün kırılımı — YATAY çubuk.
 *
 * NEDEN PASTA DEĞİL: soru "hangisi ne kadar" — pasta dilim açılarını
 * karşılaştırmayı gerektirir ve yakın değerleri ayırt ettirmez. Yatay
 * çubuk uzun kategori adlarını da kırpmadan gösterir.
 *
 * Paleti aşan kategoriler "Diğer"de toplanır; dokuzuncu bir kategori için
 * renk ÜRETİLMEZ.
 */
export function BreakdownBarChart({
  data,
  valueKey = 'revenue',
}: {
  data: { key: string; label: string; revenue: string; profit: string }[];
  valueKey?: 'revenue' | 'profit';
}) {
  if (data.length === 0) {
    return <EmptyChart />;
  }

  const sorted = [...data].sort((a, b) => Number(b[valueKey]) - Number(a[valueKey]));
  const head = sorted.slice(0, MAX_CATEGORY_SLICES);
  const tail = sorted.slice(MAX_CATEGORY_SLICES);

  const rows = [
    ...head.map((row, index) => ({
      label: row.label,
      value: Number(row[valueKey]),
      color: CHART_COLORS[index] ?? CHART_COLORS[0],
    })),
    ...(tail.length === 0
      ? []
      : [
          {
            label: `${OTHER_CATEGORY_LABEL} (${tail.length})`,
            value: tail.reduce((total, row) => total + Number(row[valueKey]), 0),
            color: CHART_COLORS[CHART_COLORS.length - 1],
          },
        ]),
  ];

  return (
    <ResponsiveContainer width="100%" height={Math.max(180, rows.length * 44)}>
      <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
        <CartesianGrid stroke={CHART_INK.grid} horizontal={false} />
        <XAxis
          type="number"
          tickFormatter={formatAxisMoney}
          tick={{ fontSize: 12, fill: CHART_INK.label }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          tick={{ fontSize: 12, fill: CHART_INK.label }}
          axisLine={false}
          tickLine={false}
          width={140}
        />
        <Tooltip content={<MoneyTooltip />} cursor={{ fill: CHART_INK.grid }} />
        <Bar dataKey="value" name="Tutar" radius={[0, 4, 4, 0]} maxBarSize={22}>
          {rows.map((row) => (
            <Cell key={row.label} fill={row.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Lejant — iki ve daha çok seride ZORUNLU; kimlik yalnız renkte kalmaz. */
export function ChartLegend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-4">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2">
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: item.color }}
            aria-hidden="true"
          />
          {/* Metin daima mürekkep renginde; seri rengini taşımaz. */}
          <span className="text-label-sm uppercase text-on-surface-variant">{item.label}</span>
        </li>
      ))}
    </ul>
  );
}

interface TooltipEntry {
  name?: string;
  value?: number;
  color?: string;
}

/** Tooltip TAM tutarı gösterir; eksende kısaltılan değer burada açılır. */
function MoneyTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}) {
  if (active !== true || payload === undefined || payload.length === 0) {
    return null;
  }

  return (
    <div className="rounded-[8px] border border-outline-variant bg-surface-container-lowest px-3 py-2 shadow-sm">
      <p className="text-label-sm uppercase text-on-surface-variant">{label}</p>
      <ul className="mt-1 flex flex-col gap-0.5">
        {payload.map((entry) => (
          <li key={entry.name} className="flex items-center gap-2 text-sm">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: entry.color }}
              aria-hidden="true"
            />
            <span className="text-on-surface-variant">{entry.name}</span>
            <span className="ml-auto font-financial text-on-surface">
              {formatMoney(String(entry.value ?? 0))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-40 items-center justify-center text-sm text-on-surface-variant">
      Seçilen aralıkta gösterilecek veri yok.
    </div>
  );
}
