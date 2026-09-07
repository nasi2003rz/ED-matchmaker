import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export default function StyleGuidePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-10 p-6" dir="rtl">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">راهنمای طراحی</h1>
        <p className="text-muted-foreground">
          نمونه‌ی رنگ‌ها، تایپوگرافی و کامپوننت‌های پایه — صفحه‌ی موقت فقط برای بازبینی.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">دکمه‌ها</h2>
        <div className="flex flex-wrap gap-3">
          <Button>ثبت کلاس جدید</Button>
          <Button variant="secondary">ویرایش</Button>
          <Button variant="outline">انصراف</Button>
          <Button variant="destructive">حذف</Button>
          <Button variant="ghost">جزئیات بیشتر</Button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">وضعیت‌ها (حضور و غیاب / پرداخت)</h2>
        <div className="flex flex-wrap gap-2">
          <Badge className="bg-success text-success-foreground">حاضر</Badge>
          <Badge variant="destructive">غایب</Badge>
          <Badge className="bg-warning text-warning-foreground">تأخیر</Badge>
          <Badge className="bg-info text-info-foreground">موجه</Badge>
          <Badge variant="secondary">در انتظار پرداخت</Badge>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">فرم</h2>
        <Card className="max-w-sm">
          <CardHeader>
            <CardTitle>افزودن دانش‌آموز</CardTitle>
            <CardDescription>اطلاعات پایه‌ی دانش‌آموز را وارد کنید.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="name">نام و نام خانوادگی</Label>
              <Input id="name" placeholder="مثلاً سارا احمدی" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">شماره تماس والدین</Label>
              <Input id="phone" placeholder="09xxxxxxxxx" />
            </div>
          </CardContent>
          <CardFooter className="justify-end gap-2">
            <Button variant="outline">انصراف</Button>
            <Button>افزودن</Button>
          </CardFooter>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">آواتار و جداکننده</h2>
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback>ع.ک</AvatarFallback>
          </Avatar>
          <span>علی کریمی — مربی شنا</span>
        </div>
        <Separator />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">تب‌ها</h2>
        <Tabs defaultValue="today">
          <TabsList>
            <TabsTrigger value="today">امروز</TabsTrigger>
            <TabsTrigger value="week">این هفته</TabsTrigger>
            <TabsTrigger value="month">این ماه</TabsTrigger>
          </TabsList>
          <TabsContent value="today" className="text-sm text-muted-foreground">
            دو کلاس امروز — شنا مقدماتی ساعت ۱۶، فوتبال ساعت ۱۸
          </TabsContent>
          <TabsContent value="week" className="text-sm text-muted-foreground">
            برنامه‌ی این هفته
          </TabsContent>
          <TabsContent value="month" className="text-sm text-muted-foreground">
            برنامه‌ی این ماه
          </TabsContent>
        </Tabs>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">جدول دانش‌آموزان</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>نام</TableHead>
              <TableHead>کلاس</TableHead>
              <TableHead>وضعیت شهریه</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>سارا احمدی</TableCell>
              <TableCell>شنا مقدماتی</TableCell>
              <TableCell>
                <Badge className="bg-success text-success-foreground">پرداخت‌شده</Badge>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>رضا محمدی</TableCell>
              <TableCell>فوتبال پایه</TableCell>
              <TableCell>
                <Badge className="bg-warning text-warning-foreground">پرداخت جزئی</Badge>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">حالت بارگذاری (Loading State)</h2>
        <div className="space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </section>
    </div>
  );
}
