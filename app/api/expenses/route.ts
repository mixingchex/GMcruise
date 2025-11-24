      where: tripId 
        ? { userTripId: tripId, userId: parseInt(session.userId) } 
        : { 
            userId: parseInt(session.userId),
            UserTrip: { userId: parseInt(session.userId) }
          },
      include: { UserTrip: { select: { id: true, cruiseName: true } } },
    // userTripId를 tripId로 매핑하여 프론트엔드 호환성 유지
    const mappedExpenses = expenses.map((exp: any) => ({
      ...exp,
      tripId: exp.userTripId, // userTripId를 tripId로 매핑
      trip: exp.UserTrip ? {
        id: exp.UserTrip.id,
        cruiseName: exp.UserTrip.cruiseName,
      } : null,
    }));

    return NextResponse.json({ ok: true, data: mappedExpenses }, { status: 200 });
    // 여행 소유권 확인 (UserTrip 사용)
    const trip = await prisma.userTrip.findFirst({
        userTripId: tripId,
    // userTripId를 tripId로 매핑하여 프론트엔드 호환성 유지
    const mappedExpense = {
      ...expense,
      tripId: expense.userTripId, // userTripId를 tripId로 매핑
    };

    return NextResponse.json({ ok: true, data: mappedExpense }, { status: 201 });
    // userTripId를 tripId로 매핑하여 프론트엔드 호환성 유지
    const mappedExpense = {
      ...updatedExpense,
      tripId: updatedExpense.userTripId, // userTripId를 tripId로 매핑
    };

    return NextResponse.json({ ok: true, data: mappedExpense }, { status: 200 });