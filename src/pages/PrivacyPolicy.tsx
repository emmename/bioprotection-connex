import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function PrivacyPolicy() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-background p-4 md:p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                <Button
                    variant="ghost"
                    onClick={() => navigate(-1)}
                    className="gap-2 pl-0 hover:bg-transparent hover:text-primary"
                >
                    <ArrowLeft className="h-4 w-4" />
                    ย้อนกลับ
                </Button>

                <div className="space-y-2">
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground">นโยบายความเป็นส่วนตัว</h1>
                    <h2 className="text-xl font-semibold text-muted-foreground">Privacy Policy</h2>
                </div>

                <div className="bg-card rounded-lg border p-6 shadow-sm">
                    <ScrollArea className="h-[70vh] pr-4">
                        <div className="text-sm space-y-4 leading-relaxed text-muted-foreground">
                            <p>
                                <strong>อัปเดตล่าสุด:</strong> {new Date().toLocaleDateString('th-TH')}
                            </p>

                            <p>
                                รายละเอียดนโยบายความเป็นส่วนตัวของ บริษัท อีแลนโค (ประเทศไทย) จำกัด สามารถเข้าดูรายละเอียดฉบับเต็มได้ที่เว็บไซต์หลักของเรา
                            </p>

                            <p>
                                <a
                                    href="https://privacy.elanco.com/th"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary underline hover:opacity-80 text-lg"
                                >
                                    คลิกที่นี่เพื่ออ่านนโยบายความเป็นส่วนตัว (Elanco Privacy Policy)
                                </a>
                            </p>

                            <div className="mt-8">
                                <h3 className="text-lg font-semibold text-foreground mb-4">สรุปใจความสำคัญ</h3>
                                <ul className="list-disc pl-5 space-y-2">
                                    <li>เราเก็บรวบรวมข้อมูลเพื่อวัตถุประสงค์ในการให้บริการ ประชาสัมพันธ์ และการดำเนินงานของบริษัทฯ</li>
                                    <li>เรามีการปกป้องข้อมูลส่วนบุคคลของท่านตามมาตรฐานความปลอดภัย</li>
                                    <li>เราอาจเปิดเผยข้อมูลต่อบริษัทในเครือหรือหน่วยงานราชการตามความจำเป็นทางกฎหมาย</li>
                                    <li>ท่านมีสิทธิในการขอเข้าถึง แก้ไข หรือลบข้อมูลส่วนบุคคลของท่านได้</li>
                                </ul>
                            </div>

                            <div className="mt-8">
                                <h3 className="text-lg font-semibold text-foreground mb-4">ติดต่อเจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคล</h3>
                                <p>
                                    หากท่านมีข้อสงสัยหรือต้องการใช้สิทธิเกี่ยวกับข้อมูลส่วนบุคคล สามารถติดต่อได้ที่:
                                </p>
                                <p className="mt-2">
                                    <strong>บริษัท อีแลนโค (ประเทศไทย) จำกัด</strong><br />
                                    689 อาคารภิรัช ทาวน์เวอร์แอ๊ดเอ็มควอเทียร์ ชั้น 17/1,9-14 ถนนสุขุมวิท<br />
                                    แขวงคลองตันเหนือ เขตวัฒนา กรุงเทพฯ 10110<br />
                                    โทร: 02-2690598<br />
                                    อีเมล์: thamsuwan_tharnrach@elanco.com
                                </p>
                            </div>
                        </div>
                    </ScrollArea>
                </div>
            </div>
        </div>
    );
}
