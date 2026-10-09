<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    public function createApplication()
    {
        $app = parent::createApplication();

        $driver = $app['config']->get('database.default');
        $database = $app['config']->get("database.connections.{$driver}.database");
        $url = $app['config']->get("database.connections.{$driver}.url");
        if (($driver === 'sqlite' && $database === ':memory:' && ! $url)
            || ($driver === 'mysql' && $database === 'skms_test' && ! $url)) {
            return $app;
        }

        throw new \RuntimeException('Tests require SQLite :memory: or MySQL database skms_test; refusing any other database.');
    }
}
