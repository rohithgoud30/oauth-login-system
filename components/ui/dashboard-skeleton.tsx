/** biome-ignore-all lint/suspicious/noArrayIndexKey: The skeleton list is static, so using an index for the key is safe. */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-6">
			<div className="w-full max-w-4xl">
				<Card className="mb-6 bg-white/80 backdrop-blur-sm">
					<CardHeader className="flex flex-row items-center justify-between">
						<div className="flex items-center gap-4">
							<Skeleton className="h-16 w-16 rounded-full" />
							<div className="space-y-2">
								<Skeleton className="h-6 w-48" />
								<Skeleton className="h-4 w-64" />
							</div>
						</div>
						<Skeleton className="h-10 w-24" />
					</CardHeader>
				</Card>

				<Card className="bg-white/80 backdrop-blur-sm">
					<CardHeader>
						<CardTitle>
							<Skeleton className="h-7 w-1/3" />
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-8">
						{[...Array(3)].map((_, i) => (
							<div key={`skeleton-group-${i}`} className="space-y-4">
								<Skeleton className="h-6 w-1/4" />
								<div className="p-4 border rounded-lg space-y-3">
									<Skeleton className="h-4 w-full" />
									<Skeleton className="h-4 w-5/6" />
									<Skeleton className="h-4 w-1/2" />
								</div>
							</div>
						))}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
