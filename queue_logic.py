from models import Token, TokenStatus


def recommend_best_counter(counters, db):
    best_counter = None
    lowest_wait = float("inf")

    for counter in counters:
        waiting_count = db.query(Token).filter(
            Token.counter_id == counter.id,
            Token.status == TokenStatus.waiting
        ).count()

        estimated_wait = waiting_count * counter.avg_service_time

        if estimated_wait < lowest_wait:
            lowest_wait = estimated_wait
            best_counter = counter

    return best_counter, lowest_wait