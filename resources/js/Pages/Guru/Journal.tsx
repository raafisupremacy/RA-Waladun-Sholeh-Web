import { Head, usePage } from '@inertiajs/react';
import TeacherLayout from '@/Layouts/TeacherLayout';
import ResponsiveTable from '@/Components/ResponsiveTable';
type Journal={id:number; journal_date:string; status:string; student?:{name:string}};
export default function Journal({ journals }: { journals:{data:Journal[]} }) { const props=usePage().props as {appName?:string;schoolSettings?:Record<string,string>}; const rows=(journals?.data??[]).map(j=>({id:j.id,tanggal:j.journal_date,siswa:j.student?.name??'',status:j.status})); return <TeacherLayout appName={props.appName} schoolName={props.schoolSettings?.school_name}><Head title="Jurnal harian"/><section className="styleguide-intro"><p className="eyebrow">Jurnal</p><h1>Jurnal harian</h1><p>Isi perkembangan siswa di kelas Anda.</p></section><ResponsiveTable rows={rows} columns={[{key:'tanggal',label:'Tanggal'},{key:'siswa',label:'Siswa'},{key:'status',label:'Status'}]}/></TeacherLayout>; }
