import { Header } from "@/components/shared/header";
import { getHierarchies } from "@/app/admin/hierarchy/actions";
import { HierarchyColumns } from "@/components/admin/hierarchy-columns";

export const revalidate = 0; // Ensure data is un-cached

export default async function HierarchyPage() {
  const hierarchies = await getHierarchies();

  return (
    <>
      <Header title="Hierarchy Setup" />
      
      <div className="max-w-[1920px] mx-auto">
        <section className="mb-8 max-w-2xl">
          <h2 className="text-3xl font-light text-display-ink mb-2 tracking-wide">
            Curriculum Structure
          </h2>
          <p className="text-body-gray leading-relaxed">
            Map out your exact educational structure. Select a Board to reveal its Classes,
            then a Class for its Subjects, and finally the Subjects to map the active Chapters.
          </p>
        </section>
        
        {/* Render 4-column cascading layout */}
        <HierarchyColumns initialData={hierarchies} />
      </div>
    </>
  );
}
