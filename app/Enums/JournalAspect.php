<?php

namespace App\Enums;

enum JournalAspect: string
{
    case Moral = 'nilai_agama_moral';
    case Physical = 'fisik_motorik';
    case Cognitive = 'kognitif';
    case Language = 'bahasa';
    case SocialEmotional = 'sosial_emosional';
}
