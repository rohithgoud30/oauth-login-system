import { Suspense } from "react";
import { DashboardContent } from "./dashboard-content";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
	title: "Dashboard",
	description:
		"OAuth authentication dashboard with user information and token details",
};

function DashboardSkeleton() {
	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
			<div className="container mx-auto space-y-6">
				<div className="flex items-center justify-between">
					<div className="space-y-2">
						<Skeleton className="h-8 w-40" />
						<Skeleton className="h-4 w-64" />
					</div>
					<Skeleton className="h-10 w-24" />
				</div>
				
				<div className="bg-white rounded-lg p-6 shadow-sm border">
					<div className="space-y-2 mb-4">
						<div className="flex items-center gap-2">
							<Skeleton className="h-5 w-5 rounded-full" />
							<Skeleton className="h-6 w-48" />
						</div>
						<Skeleton className="h-4 w-64" />
					</div>
					
					<div className="space-y-4 mt-6">
						{/* Step 1 */}
						<div className="border rounded-lg p-4 bg-gradient-to-r from-blue-50 to-blue-100">
							<div className="flex items-center gap-4">
								<Skeleton className="h-8 w-8 rounded-full" />
								<div className="flex-1">
									<Skeleton className="h-4 w-48 mb-2" />
									<Skeleton className="h-3 w-64" />
								</div>
							</div>
						</div>
						
						{/* Step 2 */}
						<div className="border rounded-lg p-4 bg-gradient-to-r from-yellow-50 to-yellow-100">
							<div className="flex items-center gap-4">
								<Skeleton className="h-8 w-8 rounded-full" />
								<div className="flex-1">
									<Skeleton className="h-4 w-48 mb-2" />
									<Skeleton className="h-3 w-64" />
								</div>
							</div>
						</div>
						
						{/* Step 3 */}
						<div className="border rounded-lg p-4 bg-gradient-to-r from-purple-50 to-purple-100">
							<div className="flex items-center gap-4">
								<Skeleton className="h-8 w-8 rounded-full" />
								<div className="flex-1">
									<Skeleton className="h-4 w-48 mb-2" />
									<Skeleton className="h-3 w-64" />
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export default function DashboardPage() {
	return (
		<Suspense fallback={<DashboardSkeleton />}>
			<DashboardContent />
		</Suspense>
	);
}
