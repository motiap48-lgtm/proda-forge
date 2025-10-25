import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const data = [
  { month: "Янв", planned: 4000, actual: 3800 },
  { month: "Фев", planned: 3000, actual: 3200 },
  { month: "Мар", planned: 5000, actual: 4800 },
  { month: "Апр", planned: 4500, actual: 4600 },
  { month: "Май", planned: 6000, actual: 5800 },
  { month: "Июн", planned: 5500, actual: 5700 },
];

export const ProductionChart = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>План-факт производства</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="month" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.5rem",
              }}
            />
            <Legend />
            <Bar dataKey="planned" fill="hsl(var(--primary))" name="План" radius={[4, 4, 0, 0]} />
            <Bar dataKey="actual" fill="hsl(var(--accent))" name="Факт" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
